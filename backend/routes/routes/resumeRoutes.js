const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const pdfParseModule = require("pdf-parse");
const mammoth = require("mammoth");

const Resume = require("../../models/Resume");
const auth = require("../../middleware/auth");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 10MB
});

function inferExtension(file) {
  const original = file.originalname || "";
  const ext = path.extname(original).toLowerCase();
  if (ext) return ext;
  if (file.mimetype === "application/pdf") return ".pdf";
  if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return ".docx";
  if (file.mimetype === "text/plain") return ".txt";
  return "";
}

const { PDFParse } = pdfParseModule;

function normaliseLines(raw) {
  return raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);
}

function parseStructuredResume(extractedText) {
  const result = {
    headline: "",
    location: "",
    summary: "",
    skills: [],
    experience: [],
    projects: [],
  };

  if (!extractedText) return result;

  const lines = normaliseLines(extractedText);
  if (!lines.length) return result;

  // Rough headline + location from first few lines
  result.headline = lines[1] || "";
  const possibleLocation = lines[2] || "";
  if (
    /\b(remote|india|usa|uk|europe|canada|australia|bangalore|delhi|mumbai|hyderabad|pune|chennai)\b/i.test(
      possibleLocation
    )
  ) {
    result.location = possibleLocation;
  }

  const sections = {
    skills: [],
    experience: [],
    projects: [],
    other: [],
  };

  let current = "other";
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/^skills\b|technical skills|key skills/.test(lower)) {
      current = "skills";
      continue;
    }
    if (/experience|work experience|professional experience/.test(lower)) {
      current = "experience";
      continue;
    }
    if (/projects?|project experience/.test(lower)) {
      current = "projects";
      continue;
    }
    sections[current].push(line);
  }

  // Summary from initial "other" lines
  if (sections.other.length) {
    result.summary = sections.other.slice(0, 4).join(" ");
  }

  // Skills parsing
  if (sections.skills.length) {
    const rawSkills = sections.skills.join(" ");
    const tokens = rawSkills
      .split(/[,•\u2022;|]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && !/^skills$/i.test(s));
    const seen = new Set();
    for (const t of tokens) {
      const key = t.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.skills.push(t);
      }
    }
  }

  function blocksFromLines(sectionLines) {
    const blocks = [];
    let currentBlock = [];
    for (const l of sectionLines) {
      if (!l.trim()) {
        if (currentBlock.length) {
          blocks.push(currentBlock.join("\n"));
          currentBlock = [];
        }
      } else {
        currentBlock.push(l);
      }
    }
    if (currentBlock.length) blocks.push(currentBlock.join("\n"));
    return blocks;
  }

  // Experience parsing
  if (sections.experience.length) {
    const blocks = blocksFromLines(sections.experience);
    for (const block of blocks) {
      const blockLines = normaliseLines(block);
      if (!blockLines.length) continue;
      const header = blockLines[0];
      const rest = blockLines.slice(1).join(" \n");
      let title = header;
      let company = "";
      const parts = header.split(/[-@\u2013]| at /i);
      if (parts.length >= 2) {
        title = parts[0].trim();
        company = parts.slice(1).join("-").trim();
      }
      const periodMatch = block.match(
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[^\n]+\d{4}[^\n]*?(?:-|to)[^\n]*?(Present|Now|\d{4})/i
      );
      const period = periodMatch ? periodMatch[0].trim() : "";
      result.experience.push({
        title,
        company,
        period,
        details: rest || blockLines.join(" \n"),
      });
    }
  }

  // Projects parsing
  if (sections.projects.length) {
    const blocks = blocksFromLines(sections.projects);
    const techKeywords = [
      "javascript",
      "typescript",
      "react",
      "next",
      "node",
      "express",
      "python",
      "django",
      "flask",
      "java",
      "spring",
      "mongodb",
      "mysql",
      "postgres",
      "aws",
      "azure",
      "gcp",
      "docker",
      "kubernetes",
      "redis",
    ];

    for (const block of blocks) {
      const blockLines = normaliseLines(block);
      if (!blockLines.length) continue;
      const name = blockLines[0];
      const details = blockLines.slice(1).join(" \n");
      const lower = block.toLowerCase();
      const techStack = [];
      for (const kw of techKeywords) {
        if (lower.includes(kw)) techStack.push(kw);
      }
      result.projects.push({ name, techStack, details });
    }
  }

  return result;
}

async function extractTextFromUpload(file) {
  const ext = inferExtension(file);
  if (ext === ".pdf") {
    if (typeof PDFParse !== "function") {
      throw new Error("PDF parsing library not available in this runtime.");
    }
    const parser = new PDFParse({ data: file.buffer });
    try {
      const parsed = await parser.getText();
      return (parsed.text || "").trim();
    } finally {
      await parser.destroy().catch(() => {});
    }
  }
  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return (result.value || "").trim();
  }
  if (ext === ".txt" || file.mimetype?.startsWith("text/")) {
    return file.buffer.toString("utf8").trim();
  }
  const mime = file.mimetype || "";
  const isText = mime.startsWith("text/");
  const seemsLikeText = isText || mime === "application/octet-stream";
  if (seemsLikeText) {
    return file.buffer.toString("utf8").trim();
  }
  throw new Error("Unsupported file type. Please upload PDF, DOCX, or TXT.");
}

router.post("/upload", upload.single("resume"), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "Missing file field: resume" });

    const extractedText = await extractTextFromUpload(file);
    if (!extractedText) {
      return res.status(422).json({ error: "Could not extract any text from the resume." });
    }

    const ext = inferExtension(file);
    const storedName = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext || ""}`;
    const uploadsDir = path.join(__dirname, "..", "..", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, storedName), file.buffer);

    const structured = parseStructuredResume(extractedText);

    const userId = req.userId || null;

    const doc = await Resume.create({
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype || "application/octet-stream",
      sizeBytes: file.size,
      extractedText,
      headline: structured.headline,
      location: structured.location,
      summary: structured.summary,
      skills: structured.skills,
      experience: structured.experience,
      projects: structured.projects,
      userId,
    });

    res.json({
      message: "Resume uploaded & parsed successfully",
      resume: {
        id: doc._id,
        originalName: doc.originalName,
        storedName: doc.storedName,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        createdAt: doc.createdAt,
        extractedTextPreview: doc.extractedText.slice(0, 3000),
        headline: doc.headline,
        location: doc.location,
        summary: doc.summary,
        skills: doc.skills,
        experience: doc.experience,
        projects: doc.projects,
      },
    });
  } catch (e) {
    console.error("API_ERROR", e);
    return res.status(500).json({ error: "Failed to upload resume" });
  }
});

router.use(auth);

router.get("/mine", async (req, res, next) => {
  try {
    const docs = await Resume.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
    res.json({ resumes: docs });
  } catch (e) {
    next(e);
  }
});

module.exports = router;