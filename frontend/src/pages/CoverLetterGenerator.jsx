import { useState, useRef } from "react";
import axios from "axios";
import html2pdf from "html2pdf.js";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { API_BASE } from "../config";

export default function CoverLetterGenerator() {
  const { currentUser } = useAuth();
  const { resume, jobDescription } = useApp();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [tone, setTone] = useState("professional");
  const [coverLetter, setCoverLetter] = useState("");
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState("");
  const letterRef = useRef(null);

  const hasResume = !!resume?.id;

  const handleGenerate = async () => {
    if (!currentUser) {
      setCoverError("Please login to generate cover letters.");
      return;
    }
    if (!jobDescription?.trim()) {
      setCoverError("Add a job description in Job Analyzer first.");
      return;
    }
    if (!hasResume) {
      setCoverError("Upload a resume first.");
      return;
    }
    setCoverError("");
    setCoverLetter("");
    setCoverLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/ai/cover-letter`, {
        jobDescription,
        resumeId: resume.id,
        companyName: company,
        roleTitle: role,
        tone,
      });
      setCoverLetter(res.data.coverLetter || "");
    } catch (e) {
      setCoverError(e.response?.data?.error || "Generation failed.");
    } finally {
      setCoverLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (coverLetter) navigator.clipboard?.writeText(coverLetter).catch(() => {});
  };

  const downloadAsPDF = () => {
    if (!letterRef.current || !coverLetter) return;
    const opt = {
      margin:       1,
      filename:     `Cover_Letter_${company ? company.replace(/\s+/g, '_') : 'Role'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(letterRef.current).save();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
          Cover Letter Generator
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Generate a tailored cover letter from your resume and job description.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Options
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company (optional)</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Google"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Role title (optional)</label>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Engineer"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="professional">Professional</option>
                <option value="enthusiastic">Enthusiastic</option>
                <option value="confident">Confident</option>
                <option value="concise">Concise</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={coverLoading}
              className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 hover:bg-violet-500 disabled:opacity-70"
            >
              {coverLoading ? "Generating…" : "Generate cover letter"}
            </button>
          </div>
          {coverError && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{coverError}</p>}
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Uses your uploaded resume and the job description from Job Analyzer.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Generated letter
            </h3>
            {coverLetter && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={downloadAsPDF}
                  className="rounded-lg border border-violet-500 bg-violet-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-violet-500 shadow-sm transition-colors flex items-center gap-1"
                >
                  📥 Download PDF
                </button>
              </div>
            )}
          </div>
          <div className="mt-4 min-h-[280px] rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            {coverLetter ? (
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 dark:text-slate-300">
                {coverLetter}
              </pre>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">
                Click Generate to create a tailored cover letter. Paste a JD in Job Analyzer first.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Hidden div used specifically for clean PDF export independent of dark/light theme */}
      <div style={{ display: "none" }}>
        <div 
          ref={letterRef} 
          style={{ 
            padding: "40px", 
            fontFamily: "Arial, sans-serif", 
            color: "#000", 
            backgroundColor: "#fff", 
            fontSize: "11pt", 
            whiteSpace: "pre-wrap", 
            lineHeight: "1.6" 
          }}
        >
          {coverLetter}
        </div>
      </div>

      {!currentUser && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sign in to generate cover letters.
        </p>
      )}
    </div>
  );
}
