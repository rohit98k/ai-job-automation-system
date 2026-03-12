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

const app = express();

app.use(cors());
app.use(express.json({ limit: "25mb" }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({ ok: true, message: "Backend working" });
});

app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/jobs", jobRoutes);

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

async function start() {
  if (!MONGODB_URI) {
    console.warn("MONGODB_URI missing. Set it in backend/.env to enable MongoDB.");
  } else {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((e) => {
  console.error("Failed to start server", e);
  process.exit(1);
});