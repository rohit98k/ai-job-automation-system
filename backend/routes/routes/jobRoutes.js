const express = require("express");
const mongoose = require("mongoose");
const Job = require("../../models/Job");
const auth = require("../../middleware/auth");

const router = express.Router();

router.use(auth);

function isDbReady() {
  return mongoose.connection?.readyState === 1;
}

router.get("/", async (req, res, next) => {
  try {
    if (!isDbReady()) {
      return res.json({ jobs: [] });
    }
    const jobs = await Job.find({ userId: req.userId }).sort({ updatedAt: -1 }).lean();
    res.json({ jobs });
  } catch (e) {
    // Provide useful error details in dev to unblock setup
    res.status(500).json({
      error: "Job fetch failed",
      message: e?.message,
      stack: process.env.NODE_ENV === "production" ? undefined : e?.stack,
    });
  }
});

router.post("/", async (req, res, next) => {
  try {
    if (!isDbReady()) {
      return res.status(503).json({ error: "Database not connected. Configure MONGODB_URI first." });
    }
    const { company, title, location, url, status, appliedDate, notes, jobDescription, resumeId } =
      req.body || {};
    if (!company || !title) return res.status(400).json({ error: "company and title are required" });

    const job = await Job.create({
      company,
      title,
      location: location || "",
      url: url || "",
      status: status || "saved",
      appliedDate: appliedDate ? new Date(appliedDate) : null,
      notes: notes || "",
      jobDescription: jobDescription || "",
      resumeId: resumeId || null,
      userId: req.userId,
    });

    res.status(201).json({ job });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    if (!isDbReady()) {
      return res.status(503).json({ error: "Database not connected. Configure MONGODB_URI first." });
    }
    const patch = { ...req.body };
    if (patch.appliedDate) patch.appliedDate = new Date(patch.appliedDate);

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      patch,
      { new: true }
    ).lean();
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json({ job });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!isDbReady()) {
      return res.status(503).json({ error: "Database not connected. Configure MONGODB_URI first." });
    }
    const job = await Job.findOneAndDelete({ _id: req.params.id, userId: req.userId }).lean();
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;

