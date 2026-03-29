import { useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { API_BASE } from "../config";

export default function SkillGapAnalyzer() {
  const { currentUser } = useAuth();
  const { resume, jobDescription, setJobDescription } = useApp();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  const hasResume = !!resume?.id;

  const handleAnalyze = async () => {
    if (!currentUser) {
      setError("Please login to run skill gap analysis.");
      return;
    }
    if (!jobDescription?.trim()) {
      setError("Paste a job description first.");
      return;
    }
    if (!hasResume) {
      setError("Upload a resume first.");
      return;
    }
    setAnalyzing(true);
    setError("");
    setAnalysis(null);
    try {
      const res = await axios.post(`${API_BASE}/api/ai/resume-analyze`, {
        jobDescription,
        resumeId: resume.id,
      });
      setAnalysis(res.data.analysis);
    } catch (e) {
      setError(e.response?.data?.error || "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  const matchScore = useMemo(() => {
    const raw = analysis?.matchScore;
    if (typeof raw === "number") return raw;
    if (!raw) return null;
    const n = Number(String(raw).replace("%", ""));
    return Number.isNaN(n) ? null : n;
  }, [analysis]);

  const gapPercent = matchScore != null ? Math.round(100 - matchScore) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
          Skill Gap Analyzer
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          See missing skills vs the job description and get targeted improvement tips.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Job description
        </h2>
        <textarea
          rows={4}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description to compare with your resume…"
          className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={analyzing}
          className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 hover:bg-violet-500 disabled:opacity-70"
        >
          {analyzing ? "Analyzing…" : "Analyze skill gap"}
        </button>
        {error && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      </div>

      {analysis && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Gap overview
            </h3>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-2xl font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                {matchScore != null ? `${Math.round(matchScore)}%` : "—"}
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Resume match</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {gapPercent != null && gapPercent > 0
                    ? `~${gapPercent}% gap to address (keywords & experience).`
                    : "Strong alignment with JD."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Missing keywords (add to resume)
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {(analysis.missingKeywords || []).map((kw, i) => (
                <span
                  key={i}
                  className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                >
                  {kw}
                </span>
              ))}
              {(!analysis.missingKeywords || analysis.missingKeywords.length === 0) && (
                <p className="text-sm text-slate-500 dark:text-slate-400">None identified.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Targeted improvement tips
            </h3>
            <ul className="mt-4 space-y-2">
              {(analysis.rewriteSuggestions || []).map((tip, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
                >
                  <span className="text-violet-500">•</span>
                  {tip}
                </li>
              ))}
              {(analysis.bulletImprovements || []).map((tip, i) => (
                <li
                  key={`b-${i}`}
                  className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
                >
                  <span className="text-violet-500">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {analysis.riskFlags && analysis.riskFlags.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-900/20 lg:col-span-2">
              <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-200">Risk flags</h3>
              <ul className="mt-2 space-y-1 text-sm text-rose-700 dark:text-rose-300">
                {analysis.riskFlags.map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!analysis && !analyzing && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/30">
          <p className="text-slate-600 dark:text-slate-400">
            Paste a job description above and click &quot;Analyze skill gap&quot; to see missing skills and tips.
          </p>
        </div>
      )}

      {!currentUser && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sign in to run skill gap analysis.
        </p>
      )}
    </div>
  );
}
