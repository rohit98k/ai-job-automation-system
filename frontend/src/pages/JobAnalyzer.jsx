import { useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { API_BASE } from "../config";

function Badge({ children, tone = "default" }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset";
  const toneClass =
    tone === "green" ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/40 dark:text-emerald-300" :
    tone === "red" ? "bg-rose-500/10 text-rose-700 ring-rose-500/40 dark:text-rose-300" :
    tone === "amber" ? "bg-amber-500/10 text-amber-700 ring-amber-500/40 dark:text-amber-300" :
    "bg-slate-500/10 text-slate-700 ring-slate-500/40 dark:text-slate-300";
  return <span className={`${base} ${toneClass}`}>{children}</span>;
}

const STATUS_BADGE_CLASS = {
  saved: "bg-slate-600 text-slate-100 dark:bg-slate-700",
  applied: "bg-blue-600 text-blue-50 dark:bg-blue-700",
  interview: "bg-emerald-600 text-emerald-50 dark:bg-emerald-700",
  offer: "bg-amber-500 text-amber-50 dark:bg-amber-600",
  rejected: "bg-rose-600 text-rose-50 dark:bg-rose-700",
};

export default function JobAnalyzer() {
  const { currentUser } = useAuth();
  const { resume, jobs, setJobs, jobDescription, setJobDescription, refreshJobs } = useApp();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analyzerError, setAnalyzerError] = useState("");

  const [jobForm, setJobForm] = useState({
    company: "",
    title: "",
    location: "",
    url: "",
    status: "saved",
    notes: "",
  });
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState("");

  const hasResume = !!resume?.id;

  const handleAnalyze = async () => {
    if (!currentUser) {
      setAnalyzerError("Please login to run AI analysis.");
      return;
    }
    if (!jobDescription.trim()) {
      setAnalyzerError("Paste a job description first.");
      return;
    }
    if (!hasResume) {
      setAnalyzerError("Upload a resume first.");
      return;
    }
    setAnalyzing(true);
    setAnalyzerError("");
    setAnalysis(null);
    try {
      const res = await axios.post(`${API_BASE}/api/ai/resume-analyze`, {
        jobDescription,
        resumeId: resume.id,
      });
      setAnalysis(res.data.analysis);
    } catch (e) {
      setAnalyzerError(e.response?.data?.error || "AI analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleJobFormChange = (field, value) => {
    setJobForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddJob = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setJobError("Please login to save jobs.");
      return;
    }
    if (!jobForm.company.trim() || !jobForm.title.trim()) {
      setJobError("Company and title required.");
      return;
    }
    setJobLoading(true);
    setJobError("");
    try {
      const res = await axios.post(`${API_BASE}/api/jobs`, {
        ...jobForm,
        resumeId: resume?.id || null,
        jobDescription: jobDescription || "",
      });
      setJobs((prev) => [res.data.job, ...prev]);
      setJobForm({ company: "", title: "", location: "", url: "", status: "saved", notes: "" });
    } catch (e) {
      setJobError(e.response?.data?.error || "Failed to save.");
    } finally {
      setJobLoading(false);
    }
  };

  const updateJobStatus = async (jobId, status) => {
    try {
      const res = await axios.patch(`${API_BASE}/api/jobs/${jobId}`, { status });
      setJobs((prev) => prev.map((j) => (j._id === jobId ? res.data.job : j)));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteJob = async (jobId) => {
    if (!window.confirm("Remove this job?")) return;
    try {
      await axios.delete(`${API_BASE}/api/jobs/${jobId}`);
      setJobs((prev) => prev.filter((j) => j._id !== jobId));
    } catch (e) {
      console.error(e);
    }
  };

  const matchScore = useMemo(() => {
    const raw = analysis?.matchScore;
    if (typeof raw === "number") return raw;
    if (!raw) return null;
    const n = Number(String(raw).replace("%", ""));
    return Number.isNaN(n) ? null : n;
  }, [analysis]);

  const matchTone = matchScore == null ? "default" : matchScore >= 80 ? "green" : matchScore >= 60 ? "amber" : "red";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
          Job Analyzer
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Paste a JD, get match score, missing keywords, and rewrite tips. Track jobs below.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Job description
          </h2>
          <textarea
            rows={6}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description…"
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Badge tone={hasResume ? "green" : "default"}>
              {hasResume ? "Resume linked" : "Upload resume first"}
            </Badge>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 hover:bg-violet-500 disabled:opacity-70"
            >
              {analyzing ? "Analyzing…" : "Run AI analysis"}
            </button>
          </div>
          {analyzerError && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{analyzerError}</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Match score
            </h3>
            {matchScore != null && (
              <Badge tone={matchTone}>
                {matchScore >= 80 ? "Strong" : matchScore >= 60 ? "Decent" : "Needs work"}
              </Badge>
            )}
          </div>
          <div className="mt-4 rounded-xl bg-slate-100 p-4 dark:bg-slate-800/50">
            <p className="text-4xl font-bold text-violet-600 dark:text-violet-400">
              {matchScore != null ? `${Math.round(matchScore)}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">ATS-style alignment with JD</p>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Top strengths</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                {(analysis?.topStrengths || []).slice(0, 3).map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
                {!analysis && <li className="text-slate-500">Run analysis to see strengths.</li>}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Missing keywords</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(analysis?.missingKeywords || []).map((kw, i) => (
                  <span key={i} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                    {kw}
                  </span>
                ))}
                {!analysis && <span className="text-xs text-slate-500">—</span>}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Rewrite tips</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                {(analysis?.rewriteSuggestions || []).slice(0, 3).map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
                {!analysis && <li className="text-slate-500">—</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Job tracker
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Save roles and update status. Login required.
        </p>
        <form onSubmit={handleAddJob} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={jobForm.company}
            onChange={(e) => handleJobFormChange("company", e.target.value)}
            placeholder="Company"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          <input
            value={jobForm.title}
            onChange={(e) => handleJobFormChange("title", e.target.value)}
            placeholder="Role title"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          <input
            value={jobForm.location}
            onChange={(e) => handleJobFormChange("location", e.target.value)}
            placeholder="Location"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          <div className="flex gap-2">
            <select
              value={jobForm.status}
              onChange={(e) => handleJobFormChange("status", e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="saved">Saved</option>
              <option value="applied">Applied</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              type="submit"
              disabled={jobLoading}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-70"
            >
              {jobLoading ? "…" : "Add"}
            </button>
          </div>
        </form>
        {jobError && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{jobError}</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => {
            const badgeClass = STATUS_BADGE_CLASS[job.status] || STATUS_BADGE_CLASS.saved;
            return (
              <article
                key={job._id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700 dark:bg-slate-800/50"
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{job.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{job.company}</p>
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white ${badgeClass}`}>
                    {job.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <select
                    value={job.status}
                    onChange={(e) => updateJobStatus(job._id, e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="saved">Saved</option>
                    <option value="applied">Applied</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => deleteJob(job._id)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-rose-900/30"
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {!jobs.length && (
          <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
            No jobs tracked yet. Add one above.
          </p>
        )}
      </section>
    </div>
  );
}
