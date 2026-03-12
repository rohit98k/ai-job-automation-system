const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema(
  {
    company: { type: String, required: true },
    title: { type: String, required: true },
    location: { type: String, default: "" },
    url: { type: String, default: "" },
    status: {
      type: String,
      enum: ["saved", "applied", "interview", "offer", "rejected"],
      default: "saved",
    },
    appliedDate: { type: Date, default: null },
    notes: { type: String, default: "" },

    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", default: null },
    resumeSnapshotText: { type: String, default: "" },
    jobDescription: { type: String, default: "" },

    aiAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },
    coverLetter: { type: String, default: "" },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", JobSchema);

