import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:5000";

const TABS = [
  { id: "resume", label: "Resume Upload" },
  { id: "analyzer", label: "AI Resume Analyzer" },
  { id: "cover", label: "AI Cover Letter" },
  { id: "tracker", label: "Job Tracker" },
];

const STATUS_BADGE_CLASS = {
  saved: "bg-slate-700 text-slate-100 ring-slate-500/40",
  applied: "bg-blue-600/90 text-blue-50 ring-blue-400/60",
  interview: "bg-emerald-600/90 text-emerald-50 ring-emerald-400/60",
  offer: "bg-amber-500/90 text-amber-50 ring-amber-300/70",
  rejected: "bg-rose-600/90 text-rose-50 ring-rose-400/60",
};

function TabButton({ tab, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-4 py-2 text-sm font-medium rounded-full border transition-all duration-200",
        active
          ? "bg-white text-slate-900 shadow-sm border-slate-200"
          : "bg-transparent text-slate-300 border-transparent hover:bg-slate-800/60 hover:text-white",
      ].join(" ")}
    >
      {tab.label}
    </button>
  );
}

function Badge({ children, tone = "default" }) {
  const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset";
  const toneClass =
    tone === "green"
      ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/40"
      : tone === "red"
      ? "bg-rose-500/10 text-rose-300 ring-rose-500/40"
      : tone === "amber"
      ? "bg-amber-500/10 text-amber-300 ring-amber-500/40"
      : "bg-slate-700/80 text-slate-200 ring-slate-500/40";
  return <span className={`${base} ${toneClass}`}>{children}</span>;
}

function App() {
  const [activeTab, setActiveTab] = useState("resume");

  const [authMode, setAuthMode] = useState("login"); // 'login' | 'signup'
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Resume upload
  const [uploading, setUploading] = useState(false);
  const [resume, setResume] = useState(null);
  const [resumeError, setResumeError] = useState("");

  // Analyzer
  const [jobDescription, setJobDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analyzerError, setAnalyzerError] = useState("");

  // Cover letter
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [tone, setTone] = useState("professional");
  const [coverLetter, setCoverLetter] = useState("");
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState("");

  // Job tracker
  const [jobs, setJobs] = useState([]);
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

  useEffect(() => {
    const token = window.localStorage.getItem("aj_token");
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      axios
        .get(`${API_BASE}/api/auth/me`)
        .then((res) => {
          setCurrentUser(res.data.user);
        })
        .catch(() => {
          window.localStorage.removeItem("aj_token");
          delete axios.defaults.headers.common.Authorization;
          setCurrentUser(null);
        });
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const fetchJobs = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/jobs`);
        setJobs(res.data.jobs || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchJobs();
  }, [currentUser]);

  const handleAuthChange = (field, value) => {
    setAuthForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const path = authMode === "signup" ? "signup" : "login";
      const payload =
        authMode === "signup"
          ? { name: authForm.name, email: authForm.email, password: authForm.password }
          : { email: authForm.email, password: authForm.password };
      const res = await axios.post(`${API_BASE}/api/auth/${path}`, payload);
      const { token, user } = res.data;
      window.localStorage.setItem("aj_token", token);
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      setCurrentUser(user);
      setShowAuthModal(false);
    } catch (e) {
      console.error(e);
      setAuthError(e.response?.data?.error || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem("aj_token");
    delete axios.defaults.headers.common.Authorization;
    setCurrentUser(null);
    setJobs([]);
    setResume(null);
    setAnalysis(null);
    setCoverLetter("");
  };

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
      console.error(e);
      setResumeError(
        e.response?.data?.error || "Resume upload failed. Please try a PDF, DOCX, or TXT file."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!currentUser) {
      setAnalyzerError("Please login to run AI analysis.");
      setAuthMode("login");
      setShowAuthModal(true);
      return;
    }
    if (!jobDescription.trim()) {
      setAnalyzerError("Job description required.");
      return;
    }
    if (!hasResume) {
      setAnalyzerError("Upload a resume first.");
      setActiveTab("resume");
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
      console.error(e);
      setAnalyzerError(
        e.response?.data?.error || "AI analysis failed. Check backend/OpenAI API key."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateCover = async () => {
    if (!currentUser) {
      setCoverError("Please login to generate cover letters.");
      setAuthMode("login");
      setShowAuthModal(true);
      return;
    }
    if (!jobDescription.trim()) {
      setCoverError("Job description required.");
      setActiveTab("analyzer");
      return;
    }
    if (!hasResume) {
      setCoverError("Upload a resume first.");
      setActiveTab("resume");
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
      console.error(e);
      setCoverError(
        e.response?.data?.error || "Cover letter generation failed. Check backend/OpenAI API key."
      );
    } finally {
      setCoverLoading(false);
    }
  };

  const handleJobFormChange = (field, value) => {
    setJobForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddJob = async (event) => {
    event.preventDefault();
    if (!currentUser) {
      setJobError("Please login to save jobs into your history.");
      setAuthMode("login");
      setShowAuthModal(true);
      return;
    }
    if (!jobForm.company.trim() || !jobForm.title.trim()) {
      setJobError("Company and role title are required.");
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
      setJobForm({
        company: "",
        title: "",
        location: "",
        url: "",
        status: "saved",
        notes: "",
      });
    } catch (e) {
      console.error(e);
      setJobError(e.response?.data?.error || "Failed to save job.");
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
    const confirm = window.confirm("Remove this job from tracker?");
    if (!confirm) return;
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
    const asNum = Number(String(raw).replace("%", ""));
    if (Number.isNaN(asNum)) return null;
    return asNum;
  }, [analysis]);

  const matchBadgeTone =
    matchScore == null
      ? "default"
      : matchScore >= 80
      ? "green"
      : matchScore >= 60
      ? "amber"
      : "red";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 lg:py-10">
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.5)]" />
            AI Job Automation System
          </div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Land more offers with{" "}
                <span className="bg-gradient-to-r from-emerald-400 via-sky-400 to-blue-400 bg-clip-text text-transparent">
                  AI-powered job tools
                </span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300/80">
                Upload your resume, analyze it against any JD, generate tailored cover letters, and
                keep a clean MongoDB-backed tracker of all your applications.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasResume && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                    CV
                  </div>
                  <div>
                    <p className="font-medium text-emerald-100">Resume ready</p>
                    <p className="text-[11px] text-emerald-200/80">
                      {resume?.originalName} • {(resume?.sizeBytes / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              )}
              {currentUser && (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-[11px]">
                  <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-100">
                    {currentUser.name
                      ? currentUser.name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "U"}
                  </div>
                  <div className="mr-2">
                    <p className="font-medium text-slate-100">
                      {currentUser.name || "User"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {currentUser.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 hover:border-rose-500/60 hover:bg-rose-500/10 hover:text-rose-200"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
          <nav className="mt-6 flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </nav>
        </header>


        <main className="space-y-6">
          {activeTab === "resume" && (
            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.2fr)]">
              <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.8)]">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Step 1 · Resume Upload
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Drop in your latest CV. We parse the text securely for AI analysis—no storage
                  outside your MongoDB.
                </p>
                <div className="mt-5">
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/60 px-5 py-8 text-center transition hover:border-emerald-500/70 hover:bg-slate-900/90">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-200">
                      ⬆
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-100">
                        {uploading ? "Uploading & parsing…" : "Click to upload or drag & drop"}
                      </p>
                      <p className="text-xs text-slate-400">
                        PDF, DOCX, or TXT · up to 10 MB
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      onChange={handleUpload}
                      disabled={uploading}
                    />
                  </label>
                  {resumeError && (
                    <p className="mt-3 text-xs text-rose-300/90">{resumeError}</p>
                  )}
                  {hasResume && (
                    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
                      <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.45)]" />
                      <div className="space-y-1.5">
                        <p className="font-medium text-emerald-100">
                          {resume.originalName} uploaded successfully
                        </p>
                        <p className="text-[11px] text-emerald-200/80">
                          Parsed text ready for AI analysis & cover letter generation.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Parsed Resume Preview
                </h3>
                <p className="mt-2 text-xs text-slate-400">
                  We show a safe preview of the extracted text so you can confirm parsing quality.
                </p>
                <div className="mt-4 h-[260px] rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-left text-xs leading-relaxed text-slate-200/90 shadow-inner shadow-black/40">
                  <div className="mb-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{hasResume ? "Extracted text" : "No resume uploaded yet"}</span>
                    {hasResume && (
                      <span>
                        Showing first{" "}
                        {resume.extractedTextPreview
                          ? resume.extractedTextPreview.length
                          : 0}{" "}
                        characters
                      </span>
                    )}
                  </div>
                  <div className="h-[200px] overflow-auto pr-1 text-[11px] text-slate-200/90">
                    {hasResume ? (
                      <pre className="whitespace-pre-wrap font-mono text-[11px]">
                        {resume.extractedTextPreview}
                      </pre>
                    ) : (
                      <p className="text-slate-500">
                        Upload your resume on the left to see how the parser reads your content.
                      </p>
                    )}
                  </div>
                </div>
                {hasResume && (
                  <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-left text-xs text-slate-200/90">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Parsed structure
                      </p>
                    </div>
                    <div className="space-y-3">
                      {(resume.headline || resume.location || resume.summary) && (
                        <div>
                          <p className="text-[11px] font-medium text-slate-100">Profile</p>
                          {resume.headline && (
                            <p className="mt-0.5 text-[11px] text-slate-200">{resume.headline}</p>
                          )}
                          {resume.location && (
                            <p className="mt-0.5 text-[11px] text-slate-400">{resume.location}</p>
                          )}
                          {resume.summary && (
                            <p className="mt-1 text-[11px] text-slate-300 line-clamp-3">
                              {resume.summary}
                            </p>
                          )}
                        </div>
                      )}
                      {Array.isArray(resume.skills) && resume.skills.length > 0 && (
                        <div>
                          <p className="text-[11px] font-medium text-slate-100">Skills</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {resume.skills.slice(0, 18).map((sk, idx) => (
                              <span
                                key={idx}
                                className="rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-100"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {Array.isArray(resume.experience) && resume.experience.length > 0 && (
                        <div>
                          <p className="text-[11px] font-medium text-slate-100">Experience</p>
                          <ul className="mt-1 space-y-1.5">
                            {resume.experience.slice(0, 3).map((exp, idx) => (
                              <li key={idx} className="text-[11px] text-slate-300">
                                <span className="font-semibold text-slate-100">
                                  {exp.title || "Role"}
                                </span>
                                {exp.company && <> · {exp.company}</>}
                                {exp.period && (
                                  <span className="block text-[10px] text-slate-400">
                                    {exp.period}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(resume.projects) && resume.projects.length > 0 && (
                        <div>
                          <p className="text-[11px] font-medium text-slate-100">Projects</p>
                          <ul className="mt-1 space-y-1.5">
                            {resume.projects.slice(0, 3).map((proj, idx) => (
                              <li key={idx} className="text-[11px] text-slate-300">
                                <span className="font-semibold text-slate-100">
                                  {proj.name || "Project"}
                                </span>
                                {Array.isArray(proj.techStack) && proj.techStack.length > 0 && (
                                  <span className="block text-[10px] text-slate-400">
                                    {proj.techStack.join(", ")}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === "analyzer" && (
            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
              <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-6">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Step 2 · AI Resume Analyzer
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Paste any job description and let the AI score your match, highlight missing
                  skills, and suggest targeted improvements.
                </p>
                <div className="mt-4 space-y-3">
                  <textarea
                    rows={7}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description here…"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-3.5 py-3 text-sm text-slate-100 shadow-inner shadow-black/40 outline-none ring-1 ring-transparent transition focus:border-emerald-500/70 focus:ring-emerald-500/40 placeholder:text-slate-500"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge tone={hasResume ? "green" : "default"}>
                        {hasResume ? "Resume linked" : "Upload resume to enable analysis"}
                      </Badge>
                    </div>
                    <button
                      type="button"
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-blue-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:shadow-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {analyzing ? "Analyzing…" : "Run AI Resume Check"}
                    </button>
                  </div>
                  {analyzerError && (
                    <p className="text-xs text-rose-300/90">{analyzerError}</p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Match Score
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      ATS-style score based on skills, keywords, and responsibilities.
                    </p>
                  </div>
                  {matchScore != null && (
                    <Badge tone={matchBadgeTone}>
                      {matchScore >= 80
                        ? "Strong match"
                        : matchScore >= 60
                        ? "Decent match"
                        : "Needs work"}
                    </Badge>
                  )}
                </div>

                <div className="mt-4 flex items-end gap-4">
                  <div className="flex-1">
                    <div className="relative h-24 rounded-2xl bg-slate-900/80 p-4">
                      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-sky-500/5 to-transparent" />
                      <div className="relative flex h-full items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-400">Overall match</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Higher score = closer alignment with JD.
                          </p>
                        </div>
                        <p className="bg-gradient-to-br from-emerald-400 via-sky-400 to-blue-500 bg-clip-text text-4xl font-semibold tracking-tight text-transparent">
                          {matchScore != null ? `${Math.round(matchScore)}%` : "--"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 text-xs md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="font-medium text-slate-100">Top strengths</p>
                      <Badge>Leverage</Badge>
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-slate-300">
                      {(analysis?.topStrengths || []).map((item, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="mt-[3px] h-1 w-1 rounded-full bg-emerald-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                      {!analysis && (
                        <li className="text-slate-500">
                          Run an analysis to see where your profile is already strong.
                        </li>
                      )}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="font-medium text-slate-100">Missing keywords</p>
                      <Badge tone="amber">Add to CV</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(analysis?.missingKeywords || []).map((kw, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200 ring-1 ring-amber-400/40"
                        >
                          {kw}
                        </span>
                      ))}
                      {!analysis && (
                        <p className="text-[11px] text-slate-500">
                          AI will suggest skills & tools to weave into your resume.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/90 p-3.5 text-xs">
                  <p className="mb-1.5 font-medium text-slate-100">Targeted rewrite tips</p>
                  <ul className="space-y-1.5 text-[11px] text-slate-300">
                    {(analysis?.rewriteSuggestions || []).map((tip, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="mt-[3px] h-1 w-1 rounded-full bg-sky-400" />
                        <span>{tip}</span>
                      </li>
                    ))}
                    {!analysis && (
                      <li className="text-slate-500">
                        When you run the analyzer, you&apos;ll get concrete bullet suggestions to
                        edit your CV.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {activeTab === "cover" && (
            <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-6">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Step 3 · AI Cover Letter
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Generate a clean, specific cover letter that ties your resume directly to the role
                  you&apos;re targeting.
                </p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        Company <span className="text-slate-500">(optional)</span>
                      </label>
                      <input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="e.g. Google"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none ring-1 ring-transparent transition focus:border-emerald-500/70 focus:ring-emerald-500/30 placeholder:text-slate-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        Role title <span className="text-slate-500">(optional)</span>
                      </label>
                      <input
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="e.g. Senior Backend Engineer"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none ring-1 ring-transparent transition focus:border-emerald-500/70 focus:ring-emerald-500/30 placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Tone</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none ring-1 ring-transparent transition focus:border-emerald-500/70 focus:ring-emerald-500/30"
                    >
                      <option value="professional">Professional</option>
                      <option value="enthusiastic">Enthusiastic</option>
                      <option value="confident">Confident</option>
                      <option value="concise">Concise</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateCover}
                    disabled={coverLoading}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:shadow-sky-400/40 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {coverLoading ? "Generating cover letter…" : "Generate AI Cover Letter"}
                  </button>
                  {coverError && <p className="text-xs text-rose-300/90">{coverError}</p>}
                  <p className="text-[11px] text-slate-500">
                    Uses the same resume & job description as the analyzer for perfect alignment.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6">
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Generated cover letter
                </h3>
                <p className="mt-2 text-xs text-slate-400">
                  You can copy, lightly edit, and paste this directly into your application.
                </p>
                <div className="mt-4 h-[280px] rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-left text-xs leading-relaxed text-slate-200 shadow-inner shadow-black/40">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{coverLetter ? "AI output" : "Waiting for generation…"}</span>
                    {coverLetter && (
                      <button
                        type="button"
                        className="rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
                        onClick={() => {
                          navigator.clipboard
                            ?.writeText(coverLetter)
                            .catch((err) => console.error("Clipboard error", err));
                        }}
                      >
                        Copy to clipboard
                      </button>
                    )}
                  </div>
                  <div className="h-[230px] overflow-auto pr-1 text-[11px] text-slate-200/90">
                    {coverLetter ? (
                      <pre className="whitespace-pre-wrap font-sans text-[11px]">
                        {coverLetter}
                      </pre>
                    ) : (
                      <p className="text-slate-500">
                        Once you click &quot;Generate AI Cover Letter&quot;, your tailored letter
                        will appear here.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "tracker" && (
            <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950/90 p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Step 4 · MongoDB Job Tracker
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-slate-300">
                    Visually track every application: where you applied, what stage you&apos;re in,
                    and which resume/JD you used.
                  </p>
                </div>
                <Badge tone="amber">
                  {jobs.length ? `${jobs.length} tracked roles` : "No jobs tracked yet"}
                </Badge>
              </div>

              <form
                onSubmit={handleAddJob}
                className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-xs md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,0.9fr)]"
              >
                <div className="space-y-1.5">
                  <label className="font-medium text-slate-200">Company & role</label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={jobForm.company}
                      onChange={(e) => handleJobFormChange("company", e.target.value)}
                      placeholder="Company"
                      className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none ring-1 ring-transparent transition focus:border-emerald-500/70 focus:ring-emerald-500/30 placeholder:text-slate-500"
                    />
                    <input
                      value={jobForm.title}
                      onChange={(e) => handleJobFormChange("title", e.target.value)}
                      placeholder="Role title"
                      className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none ring-1 ring-transparent transition focus:border-emerald-500/70 focus:ring-emerald-500/30 placeholder:text-slate-500"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="font-medium text-slate-200">Location & link</label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={jobForm.location}
                      onChange={(e) => handleJobFormChange("location", e.target.value)}
                      placeholder="Remote / Bangalore"
                      className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none ring-1 ring-transparent transition focus:border-emerald-500/70 focus:ring-emerald-500/30 placeholder:text-slate-500"
                    />
                    <input
                      value={jobForm.url}
                      onChange={(e) => handleJobFormChange("url", e.target.value)}
                      placeholder="Job post URL"
                      className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none ring-1 ring-transparent transition focus:border-emerald-500/70 focus:ring-emerald-500/30 placeholder:text-slate-500"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 md:items-end">
                  <select
                    value={jobForm.status}
                    onChange={(e) => handleJobFormChange("status", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none ring-1 ring-transparent transition focus:border-emerald-500/70 focus:ring-emerald-500/30 md:w-40"
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
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 hover:shadow-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {jobLoading ? "Saving…" : "Add to tracker"}
                  </button>
                  {jobError && <p className="text-[11px] text-rose-300/90">{jobError}</p>}
                </div>
                <div className="md:col-span-3 mt-2">
                  <textarea
                    rows={2}
                    value={jobForm.notes}
                    onChange={(e) => handleJobFormChange("notes", e.target.value)}
                    placeholder="Short notes (who referred you, recruiter name, interview prep, etc.)"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none ring-1 ring-transparent transition focus:border-emerald-500/70 focus:ring-emerald-500/30 placeholder:text-slate-500"
                  />
                </div>
              </form>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job) => {
                  const badgeClass =
                    STATUS_BADGE_CLASS[job.status] || STATUS_BADGE_CLASS.saved;
                  return (
                    <article
                      key={job._id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/95 p-4 text-xs shadow-sm shadow-black/40"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[13px] font-semibold text-slate-50">
                              {job.title}
                            </p>
                            <p className="text-[11px] text-slate-400">{job.company}</p>
                            {job.location && (
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                {job.location}
                              </p>
                            )}
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${badgeClass}`}
                          >
                            {job.status}
                          </span>
                        </div>
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-sky-300 hover:text-sky-200"
                          >
                            View posting ↗
                          </a>
                        )}
                        {job.notes && (
                          <p className="mt-1 line-clamp-3 text-[11px] text-slate-300">
                            {job.notes}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <select
                          value={job.status}
                          onChange={(e) => updateJobStatus(job._id, e.target.value)}
                          className="w-[8.5rem] rounded-full border border-slate-800 bg-slate-950/80 px-2.5 py-1.5 text-[11px] text-slate-100 outline-none ring-1 ring-transparent transition focus:border-emerald-500/70 focus:ring-emerald-500/30"
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
                          className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-300 hover:border-rose-500/60 hover:bg-rose-500/10 hover:text-rose-200"
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  );
                })}
                {!jobs.length && (
                  <div className="col-span-full rounded-2xl border border-dashed border-slate-800 bg-slate-950/80 p-6 text-center text-xs text-slate-400">
                    No jobs tracked yet. Add your first role above to start your MongoDB-powered
                    pipeline.
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {showAuthModal && !currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {authMode === "signup" ? "Create account" : "Login"}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Sign in to run AI analysis, generate cover letters and save your job history.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 hover:border-slate-500 hover:text-slate-100"
              >
                Close
              </button>
            </div>
            <div className="mt-3 inline-flex rounded-full bg-slate-900 p-1 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
                className={`flex-1 rounded-full px-3 py-1 ${
                  authMode === "login"
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-300"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setAuthError("");
                }}
                className={`flex-1 rounded-full px-3 py-1 ${
                  authMode === "signup"
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-300"
                }`}
              >
                Sign up
              </button>
            </div>
            <form
              onSubmit={handleAuthSubmit}
              className="mt-3 grid grid-cols-1 gap-2 text-[11px]"
            >
              {authMode === "signup" && (
                <div className="space-y-1">
                  <label className="text-slate-300">Name</label>
                  <input
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-[11px] text-slate-100 outline-none ring-1 ring-transparent transition focus:border-emerald-500/70 focus:ring-emerald-500/30"
                    value={authForm.name}
                    onChange={(e) => handleAuthChange("name", e.target.value)}
                    placeholder="Your name"
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-slate-300">Email</label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-[11px] text-slate-100 outline-none ring-1 ring-transparent transition focus:border-emerald-500/70 focus:ring-emerald-500/30"
                  value={authForm.email}
                  onChange={(e) => handleAuthChange("email", e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300">Password</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-[11px] text-slate-100 outline-none ring-1 ring-transparent transition focus:border-emerald-500/70 focus:ring-emerald-500/30"
                  value={authForm.password}
                  onChange={(e) => handleAuthChange("password", e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              {authError && (
                <p className="text-[11px] text-rose-300/90">{authError}</p>
              )}
              <button
                type="submit"
                disabled={authLoading}
                className="mt-1 w-full rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-900 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 hover:shadow-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {authLoading
                  ? authMode === "signup"
                    ? "Creating account…"
                    : "Logging in…"
                  : authMode === "signup"
                  ? "Create account"
                  : "Login"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;