const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Job = require("../../models/Job");
const Resume = require("../../models/Resume");
const auth = require("../../middleware/auth");

const router = express.Router();
router.use(auth);

function getClientOrNull() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "REPLACE_WITH_YOUR_REAL_KEY") return null;
  try {
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { temperature: 0.7 },
    });
  } catch (e) {
    return null;
  }
}

router.post("/", async (req, res) => {
  try {
    const { jobId, chatHistory, message } = req.body;
    
    if (!jobId || !message) {
      return res.status(400).json({ error: "jobId and message are required" });
    }

    const job = await Job.findOne({ _id: jobId, userId: req.userId }).lean();
    if (!job) return res.status(404).json({ error: "Job not found" });

    let rt = job.resumeSnapshotText || "";
    if (!rt) {
      const latest = await Resume.findOne({ userId: req.userId }).sort({ createdAt: -1 }).lean();
      if (latest) rt = latest.extractedText;
    }

    const model = getClientOrNull();
    if (!model) {
      return res.json({ 
        reply: "AI is not configured. Please add a valid GEMINI_API_KEY in the backend .env file to practice." 
      });
    }

    const systemPrompt = `You are an expert technical and HR recruiter. You are conducting a mock interview with a candidate for the role of ${job.title} at ${job.company}.
Here is the Job Description:
${job.jobDescription || "No specific job description provided, assume standard responsibilities for the role."}

Here is the Candidate's Resume:
${rt ? rt.slice(0, 10000) : "No resume provided. Ask them general questions."}

Your persona: Professional, encouraging, but rigorous. Ask one question at a time. Evaluate their previous answer briefly before asking the next question. Do not break character. Keep your responses under 150 words.`;

    const formattedHistory = (chatHistory || []).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const chat = model.startChat({
        history: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "Understood. I will act as the recruiter." }] },
            ...formattedHistory
        ]
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    console.error("INTERVIEW_AI_ERROR", err);
    res.status(500).json({ error: "Failed to generate interview response." });
  }
});

module.exports = router;
