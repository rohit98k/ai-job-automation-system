const express = require("express");
const nodemailer = require("nodemailer");
const auth = require("../../middleware/auth");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Resume = require("../../models/Resume");
const Job = require("../../models/Job");

const router = express.Router();
router.use(auth);

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true";

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(port),
      secure: !!secure,
      auth: { user, pass },
    });
  }
  return null;
}

function getClientOrNull() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "REPLACE_WITH_YOUR_REAL_KEY") return null;
  try {
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.8 } });
  } catch (e) {
    return null;
  }
}

router.post("/draft", async (req, res) => {
  try {
    const { jobId } = req.body;
    const job = await Job.findOne({ _id: jobId, userId: req.userId }).lean();
    if (!job) return res.status(404).json({ error: "Job not found" });

    let rt = job.resumeSnapshotText || "";
    if (!rt) {
      const latest = await Resume.findOne({ userId: req.userId }).sort({ createdAt: -1 }).lean();
      if (latest) rt = latest.extractedText;
    }

    const model = getClientOrNull();
    if (!model) return res.status(400).json({ error: "AI not configured. Add GEMINI_API_KEY." });

    const prompt = `Write a short, punchy cold email (under 150 words) to a recruiter at ${job.company} for the ${job.title} role.
Job Description:
${job.jobDescription || "No specific details."}
Resume:
${rt ? rt.slice(0, 5000) : "General developer"}

Return ONLY the email content. Put the subject on the first line prefixed with "Subject: ".`;

    const result = await model.generateContent(prompt);
    res.json({ draft: result.response.text() });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate draft." });
  }
});

router.post("/send", async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) return res.status(400).json({ error: "Missing to, subject, or body." });

    let transporter = getTransporter();
    let isTest = false;

    if (!transporter) {
       const testAccount = await nodemailer.createTestAccount();
       transporter = nodemailer.createTransport({
         host: "smtp.ethereal.email",
         port: 587,
         secure: false,
         auth: { user: testAccount.user, pass: testAccount.pass },
       });
       isTest = true;
    }

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@aijobautomation.com",
      to,
      subject,
      text: body,
    });

    if (isTest) {
      res.json({ ok: true, message: "Test Email Sent", preview: nodemailer.getTestMessageUrl(info) });
    } else {
      res.json({ ok: true, message: "Email Sent Successfully!" });
    }
  } catch (err) {
     console.error(err);
     res.status(500).json({ error: "Email sending failed." });
  }
});

module.exports = router;
