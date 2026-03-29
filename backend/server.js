const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const resumeRoutes = require("./routes/routes/resumeRoutes");
const aiRoutes = require("./routes/routes/aiRoutes");
const jobRoutes = require("./routes/routes/jobRoutes");
const authRoutes = require("./routes/routes/authRoutes");
const interviewRoutes = require("./routes/routes/interviewRoutes");
const emailRoutes = require("./routes/routes/emailRoutes");

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173', // Local development
    'http://localhost:5000', // Local backend
    'https://ai-job-automation-system-7mna.vercel.app', // Vercel frontend
    'https://ai-job-automation-system.vercel.app' // Production frontend
  ],
  credentials: true
}));
app.use(express.json({ limit: "25mb" }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({ ok: true, message: "Backend working" });
});

app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/ai/interview", interviewRoutes);
app.use("/api/email", emailRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-unused-vars
  const _next = next;
  console.error("API_ERROR", err);
  const payload =
    process.env.NODE_ENV === "production"
      ? { error: "Internal Server Error" }
      : { error: "Internal Server Error", message: err?.message, stack: err?.stack };
  res.status(500).json(payload);
});

const PORT = Number(process.env.PORT || 5000);
const MONGODB_URI = process.env.MONGODB_URI;

// Start server first so it always responds (no 502); then connect DB in background
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});





async function connectDB() {
  if (!process.env.MONGODB_URI) {
    console.error("❌ MONGODB_URI is not defined");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

// module.exports = connectDB;


connectDB();