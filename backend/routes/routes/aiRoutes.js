const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const Resume = require("../../models/Resume");
const Job = require("../../models/Job");
const auth = require("../../middleware/auth");

const router = express.Router();

router.use(auth);

function getClientOrNull() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "REPLACE_WITH_YOUR_REAL_KEY") {
    return null;
  }
  try {
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.4,
      },
    });
  } catch (e) {
    console.error("AI_CLIENT_INIT_ERROR", e);
    return null;
  }
}

function basicAnalysis(resumeText, jobDescription) {
  const rt = (resumeText || "").toLowerCase();
  const jd = (jobDescription || "").toLowerCase();

  const words = jd
    .split(/[^a-z0-9+.#]+/i)
    .filter((w) => w && w.length >= 4)
    .slice(0, 80);
  const uniqueKeywords = [...new Set(words)];

  const present = [];
  const missing = [];
  for (const kw of uniqueKeywords) {
    if (rt.includes(kw)) present.push(kw);
    else missing.push(kw);
  }

  const coverage =
    uniqueKeywords.length === 0
      ? 0
      : Math.round((present.length / uniqueKeywords.length) * 100);

  const matchScore = Math.min(98, Math.max(25, coverage || 40));

  const topStrengths = [];
  if (present.length) {
    topStrengths.push(
      `Your resume already mentions many of the key terms from the JD, such as: ${present
        .slice(0, 8)
        .join(", ")}.`
    );
  } else {
    topStrengths.push(
      "Your resume has general experience that can be aligned to this role once you add more role-specific keywords."
    );
  }

  const missingKeywords = missing.slice(0, 10);

  const rewriteSuggestions = [];
  if (missingKeywords.length) {
    rewriteSuggestions.push(
      `Add 1–2 bullet points that explicitly mention: ${missingKeywords
        .slice(0, 6)
        .join(", ")}.`
    );
  }
  rewriteSuggestions.push(
    "Move your most relevant experience (projects, roles, tech stack) into the top 1–2 sections so the recruiter sees it immediately."
  );
  rewriteSuggestions.push(
    "Rewrite bullets to be impact-focused using numbers (X% improvement, Y users, Z ms latency) instead of responsibilities."
  );

  const bulletImprovements = [
    "Convert generic bullets like “worked on APIs” into outcome bullets, e.g. “Designed REST APIs that reduced page load time by 35%”.",
    "Collapse older or less relevant experience into shorter sections to give more space to this role’s primary stack.",
    "Align your job titles and summaries to the wording used in the JD where it’s truthful (e.g. 'Backend Engineer' vs 'Software Developer').",
  ];

  const summaryRewrite =
    "Focused candidate for this role with experience that can be framed around the job’s core requirements. Emphasise the most relevant stack, domain and achievements in the top summary and first 3–5 bullets.";

  const riskFlags = [];
  if (coverage < 40 && uniqueKeywords.length >= 6) {
    riskFlags.push(
      "Low keyword overlap between resume and JD; ATS filters may down-rank this profile unless keywords are added."
    );
  }

  return {
    matchScore,
    topStrengths,
    missingKeywords,
    rewriteSuggestions,
    bulletImprovements,
    summaryRewrite,
    riskFlags,
  };
}

async function chatJson({ system, user, resumeText, jobDescription }) {
  const model = getClientOrNull();
  const prompt = `${system}\n\n${user}`;

  if (model) {
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const content = result.response?.text() || "{}";
      try {
        return JSON.parse(content);
      } catch {
        return { raw: content };
      }
    } catch (e) {
      console.error("AI_REMOTE_ERROR", e);
    }
  }

  // Fallback local "AI-lite" analysis when key missing/invalid or API fails
  return basicAnalysis(resumeText, jobDescription);
}

router.post("/resume-analyze", async (req, res, next) => {
  try {
    const { resumeId, resumeText, jobDescription, jobId } = req.body || {};
    const jd = (jobDescription || "").trim();
    if (!jd) return res.status(400).json({ error: "jobDescription is required" });

    let rt = (resumeText || "").trim();
    if (!rt && resumeId) {
      const doc = await Resume.findById(resumeId).lean();
      if (!doc) return res.status(404).json({ error: "Resume not found" });
      rt = doc.extractedText;
    }
    if (!rt && req.userId) {
      const latest = await Resume.findOne({ userId: req.userId }).sort({ createdAt: -1 }).lean();
      if (latest) {
        rt = latest.extractedText;
      }
    }
    if (!rt) return res.status(400).json({ error: "No resume found for this user" });

    const analysis = await chatJson({
      system:
        "You are an ATS-focused resume reviewer. Return concise, actionable feedback only as JSON.",
      user: [
        "Analyze this resume against this job description.",
        "Return JSON with keys:",
        "matchScore (0-100 number),",
        "topStrengths (string[]),",
        "missingKeywords (string[]),",
        "rewriteSuggestions (string[]),",
        "bulletImprovements (string[]),",
        "summaryRewrite (string),",
        "riskFlags (string[]).",
        "",
        `JOB_DESCRIPTION:\n${jd}`,
        "",
        `RESUME_TEXT:\n${rt.slice(0, 20000)}`,
      ].join("\n"),
      resumeText: rt,
      jobDescription: jd,
    });

    if (jobId) {
      await Job.findByIdAndUpdate(
        jobId,
        { aiAnalysis: analysis, jobDescription: jd, resumeSnapshotText: rt.slice(0, 50000) },
        { new: false }
      );
    }

    res.json({ analysis });
  } catch (e) {
    next(e);
  }
});

router.post("/cover-letter", async (req, res, next) => {
  try {
    const { resumeId, resumeText, jobDescription, companyName, roleTitle, tone, jobId } =
      req.body || {};
    const jd = (jobDescription || "").trim();
    if (!jd) return res.status(400).json({ error: "jobDescription is required" });

    let rt = (resumeText || "").trim();
    if (!rt && resumeId) {
      const doc = await Resume.findById(resumeId).lean();
      if (!doc) return res.status(404).json({ error: "Resume not found" });
      rt = doc.extractedText;
    }
    if (!rt && req.userId) {
      const latest = await Resume.findOne({ userId: req.userId }).sort({ createdAt: -1 }).lean();
      if (latest) {
        rt = latest.extractedText;
      }
    }
    if (!rt) return res.status(400).json({ error: "No resume found for this user" });

    const model = getClientOrNull();

    let coverLetter = "";

    if (model) {
      try {
        const prompt = [
          "You write modern, specific cover letters. No fluff. Use strong, measurable language.",
          "Write a 250-350 word cover letter tailored to the job description using the resume evidence.",
          "Include 1 short paragraph with 3 bullet points of relevant achievements.",
          "",
          `Company: ${companyName || ""}`.trim(),
          `Role: ${roleTitle || ""}`.trim(),
          `Tone: ${tone || "professional"}`.trim(),
          "",
          `JOB_DESCRIPTION:\n${jd}`,
          "",
          `RESUME_TEXT:\n${rt.slice(0, 20000)}`,
        ].join("\n");

        const result = await model.generateContent(prompt);
        coverLetter = (result.response?.text() || "").trim();
      } catch (e) {
        console.error("AI_REMOTE_ERROR", e);
      }
    }

    if (!coverLetter) {
      const displayCompany = companyName || "the company";
      const displayRole = roleTitle || "this role";
      coverLetter = [
        `Dear Hiring Manager,`,
        "",
        `I am excited to apply for the ${displayRole} position at ${displayCompany}. The role description strongly matches the work I have been doing, particularly around the core skills and responsibilities you highlight.`,
        "",
        `Across my recent experience I have:`,
        "- Delivered features end-to-end with a focus on reliability and performance.",
        "- Collaborated closely with cross‑functional teams to ship improvements quickly.",
        "- Taken ownership of problems, simplified complex requirements and kept stakeholders aligned.",
        "",
        "I have read the job description carefully and mapped my background to the stack, domain and expectations of this position. Where there are gaps in direct experience, I can ramp quickly because of my hands‑on work with similar tools and patterns, and my habit of learning in public and asking for feedback.",
        "",
        "Thank you for taking the time to review my profile. I would welcome the opportunity to discuss how I can contribute to your team and help you ship high‑quality work faster.",
        "",
        "Best regards,",
        "Your Candidate",
      ].join("\n");
    }

    if (jobId) {
      await Job.findByIdAndUpdate(
        jobId,
        { coverLetter, jobDescription: jd, resumeSnapshotText: rt.slice(0, 50000) },
        { new: false }
      );
    }

    res.json({ coverLetter });
  } catch (e) {
    next(e);
  }
});

router.get("/generate-search", async (req, res, next) => {
  try {
    const latest = await Resume.findOne({ userId: req.userId }).sort({ createdAt: -1 }).lean();
    if (!latest) return res.status(404).json({ error: "No resume uploaded." });
    
    const rt = latest.extractedText || "";
    const model = getClientOrNull();
    let keywordsStr = "Engineer";
    
    if (model) {
      try {
        const prompt = `Extract exactly 3 most prominent technical skills from the resume text below. Return ONLY a comma separated list of the 3 skills, nothing else. Example: React, Node.js, AWS\n\n${rt.slice(0, 5000)}`;
        const result = await model.generateContent(prompt);
        keywordsStr = (result.response?.text() || "").trim();
      } catch (e) {}
    }
    
    // Fallback if AI fails or returns weird format
    const keywords = keywordsStr.split(",").map(k => k.trim()).join("+");
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}&f_AL=true&sort=DD`; // f_AL=true is Easy Apply
    
    res.json({ url: searchUrl });
  } catch (e) {
    next(e);
  }
});

router.post("/generate-portfolio", async (req, res, next) => {
  try {
    const latest = await Resume.findOne({ userId: req.userId }).sort({ createdAt: -1 }).lean();
    if (!latest || !latest.extractedText) return res.status(404).json({ error: "Upload a resume first!" });

    const model = getClientOrNull();
    if (!model) return res.status(400).json({ error: "Gemini API key is required in .env file." });

    const prompt = `You are an elite senior frontend developer and UX designer. Create a STUNNING, single-file HTML portfolio website using standard HTML5 and Tailwind CSS (via CDN) based entirely on the following resume text. 

CRITICAL RULES:
1. Return ONLY pure raw HTML code. Do NOT wrap it in \`\`\`html markdown. Start exactly with <!DOCTYPE html> and end with </html>.
2. Include <script src="https://cdn.tailwindcss.com"></script> in the head.
3. Configure Tailwind smoothly. Add a dark mode UI, smooth scrolling, modern gradients (e.g., bg-gradient-to-r), glassmorphism (backdrop-blur), and hover animations.
4. Sections required: Awesome Hero (Name, Role, Catchy Tagline), About Me, Experience/Projects, Skills (as cool pill tags), and a Contact Footer.
5. The design must look like an award-winning $10k tech portfolio. Use deep slate/indigo/violet themes for an ultra-premium feel. Keep all CSS/JS inside the HTML file.

Resume Data:
${latest.extractedText.slice(0, 5000)}
`;
    
    // Explicitly ask for a large text response and allow higher temperature for creativity
    const result = await model.generateContent(prompt);
    let htmlCode = result.response.text();
    
    // Sanitize in case Gemini still wraps it in markdown despite instructions
    if (htmlCode.startsWith("```html")) htmlCode = htmlCode.slice(7);
    if (htmlCode.startsWith("```")) htmlCode = htmlCode.slice(3);
    if (htmlCode.endsWith("```")) htmlCode = htmlCode.slice(0, -3);

    res.json({ html: htmlCode.trim() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

