import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { API_BASE } from "../config";

export default function ResumeAnalyzer() {
  const { currentUser } = useAuth();
  const { resume, setResume } = useApp();
  const [uploading, setUploading] = useState(false);
  const [resumeError, setResumeError] = useState("");

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setResumeError("");
    setUploading(true);
    setResume(null);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await axios.post(`${API_BASE}/api/resume/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResume(res.data.resume);
    } catch (e) {
      setResumeError(
        e.response?.data?.error || "Upload failed. Use PDF, DOCX, or TXT (max 10 MB)."
      );
    } finally {
      setUploading(false);
    }
  };

  const hasResume = !!resume?.id;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
          Resume Analyzer
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Upload your resume once. We parse it for AI analysis and cover letters.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Step 1 · Upload
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            PDF, DOCX, or TXT. We extract text for AI tools—no storage outside your account.
          </p>
          <label className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-10 text-center transition hover:border-violet-400 hover:bg-violet-50/50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-violet-600 dark:hover:bg-violet-900/20">
            <span className="text-4xl">📤</span>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                {uploading ? "Uploading…" : "Click or drag & drop"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Max 10 MB</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          {resumeError && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{resumeError}</p>}
          {hasResume && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-medium text-emerald-800 dark:text-emerald-200">{resume.originalName}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Ready for Job Analyzer & Cover Letter</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Parsed preview
          </h3>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Extracted text we use for AI—confirm parsing looks correct.
          </p>
          <div className="mt-4 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            {hasResume ? (
              <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700 dark:text-slate-300">
                {resume.extractedTextPreview || "No preview"}
              </pre>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">Upload a resume to see preview.</p>
            )}
          </div>
          {hasResume && (
            <div className="mt-4 space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Structure</p>
              {(resume.headline || resume.summary) && (
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Profile</p>
                  {resume.headline && <p className="text-xs text-slate-600 dark:text-slate-400">{resume.headline}</p>}
                  {resume.summary && <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{resume.summary}</p>}
                </div>
              )}
              {Array.isArray(resume.skills) && resume.skills.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Skills</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {resume.skills.slice(0, 12).map((sk, i) => (
                      <span key={i} className="rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-700 dark:text-slate-300">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!currentUser && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sign in to link this resume to your account and use AI analysis.
        </p>
      )}
    </div>
  );
}
