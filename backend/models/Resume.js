const mongoose = require("mongoose");

const ExperienceSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    company: { type: String, default: "" },
    period: { type: String, default: "" },
    details: { type: String, default: "" },
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    techStack: [{ type: String }],
    details: { type: String, default: "" },
  },
  { _id: false }
);

const ResumeSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    extractedText: { type: String, required: true },

    headline: { type: String, default: "" },
    location: { type: String, default: "" },
    summary: { type: String, default: "" },
    skills: [{ type: String }],
    experience: [ExperienceSchema],
    projects: [ProjectSchema],

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resume", ResumeSchema);

