const API_BASE = "http://localhost:5000"; // Adjust if your backend runs on a different port
const STORAGE_KEY = "ai_job_automation_token";

function setStatus(message, kind = "neutral") {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = message || "";
  el.classList.remove("status--ok", "status--error");
  if (kind === "ok") el.classList.add("status--ok");
  if (kind === "error") el.classList.add("status--error");
}

async function getStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || "");
    });
  });
}

async function setStoredToken(token) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: token || "" }, () => resolve());
  });
}

async function sendJobToBackend(job) {
  const token = await getStoredToken();

  const payload = {
    company: job.company || "",
    title: job.title || "",
    jobDescription: job.jobDescription || "",
    url: job.url || "",
    location: "",
    status: "saved",
    notes: "Created via Chrome extension from LinkedIn job page.",
  };

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/jobs`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.error || `Backend error (status ${res.status})`;
    throw new Error(msg);
  }

  return data;
}

async function extractJobFromActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    throw new Error("Active tab nahi mila. Dobara try karo.");
  }

  const url = tab.url || "";
  if (!url.startsWith("https://www.linkedin.com/jobs/")) {
    throw new Error("LinkedIn job detail page pe jao phir button dabao.");
  }

  const response = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_JOB_DATA" });
  if (!response || !response.ok || !response.job) {
    throw new Error(response?.error || "Page se job details nahi mil paayi.");
  }

  const job = response.job;

  if (!job.title || !job.company || !job.jobDescription) {
    throw new Error(
      "Title, company ya description nahi mil rahi. Thoda scroll karke phir try karo."
    );
  }

  return { job, tabId: tab.id };
}

async function handleAnalyzeClick() {
  setStatus("LinkedIn page se job details read ho rahe hain…");

  try {
    const { job } = await extractJobFromActiveTab();

    setStatus("Job backend ko bhej rahe hain…");
    await sendJobToBackend(job);

    setStatus("Job tumhare AI Job Tracker me save ho gaya.", "ok");
  } catch (err) {
    console.error("Analyze error", err);
    setStatus(err?.message || "Kuch galat ho gaya. Thodi der baad phir try karo.", "error");
  }
}

async function handleSaveJobClick() {
  setStatus("Sirf job ko dashboard me save kar rahe hain…");
  try {
    const { job } = await extractJobFromActiveTab();
    await sendJobToBackend(job);
    setStatus("Job tumhare dashboard me save ho gayi.", "ok");
  } catch (err) {
    console.error("Save job error", err);
    setStatus(err?.message || "Job save nahi ho paayi.", "error");
  }
}

async function handleSkillGapClick() {
  setStatus("Skill gap analyzer chala rahe hain…");
  try {
    const { job } = await extractJobFromActiveTab();
    await sendJobToBackend(job);

    const token = await getStoredToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/ai/resume-analyze`, {
      method: "POST",
      headers,
      body: JSON.stringify({ jobDescription: job.jobDescription }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error || `Skill gap API error (status ${res.status})`;
      throw new Error(msg);
    }

    setStatus("Skill gap analysis tumhare dashboard ke AI section me add ho gaya.", "ok");
  } catch (err) {
    console.error("Skill gap error", err);
    setStatus(err?.message || "Skill gap analyzer fail ho gaya.", "error");
  }
}

async function handleCoverLetterClick() {
  setStatus("AI cover letter generate kar rahe hain…");
  try {
    const { job } = await extractJobFromActiveTab();
    await sendJobToBackend(job);

    const token = await getStoredToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/ai/cover-letter`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jobDescription: job.jobDescription,
        companyName: job.company,
        roleTitle: job.title,
        tone: "professional",
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error || `Cover letter API error (status ${res.status})`;
      throw new Error(msg);
    }

    setStatus(
      "Cover letter generate ho gaya. App ke AI section / job detail me dekh sakte ho.",
      "ok"
    );
  } catch (err) {
    console.error("Cover letter error", err);
    setStatus(err?.message || "Cover letter generate nahi ho paaya.", "error");
  }
}

async function handleAutoApplyClick() {
  setStatus("Easy Apply button dhundh rahe hain…");
  try {
    const { tabId } = await extractJobFromActiveTab();
    const response = await chrome.tabs.sendMessage(tabId, { type: "AUTO_APPLY" });
    if (!response || !response.ok) {
      throw new Error(response?.error || "Easy Apply button nahi mila.");
    }
    setStatus("LinkedIn pe Easy Apply button click ho gaya (beta).", "ok");
  } catch (err) {
    console.error("Auto apply error", err);
    setStatus(err?.message || "Auto apply ka click fail ho gaya.", "error");
  }
}

async function handleGenerateSearchClick() {
  setStatus("Resume se best keywords dhundh rahe hain...");
  try {
    const token = await getStoredToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/ai/generate-search`, { headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || "AI API call fail ho gayi.");
    }
    
    setStatus("URL ban gaya! Naya tab open ho raha hai...", "ok");
    chrome.tabs.create({ url: data.url });
  } catch (err) {
    console.error("Generate search error", err);
    setStatus(err?.message || "Search generate nahi ho payi.", "error");
  }
}

async function initPopup() {
  const analyzeBtn = document.getElementById("analyze-btn");
  const saveJobBtn = document.getElementById("save-job-btn");
  const skillGapBtn = document.getElementById("skill-gap-btn");
  const coverLetterBtn = document.getElementById("cover-letter-btn");
  const autoApplyBtn = document.getElementById("auto-apply-btn");
  const generateSearchBtn = document.getElementById("generate-search-btn");
  const saveTokenBtn = document.getElementById("save-token-btn");
  const tokenInput = document.getElementById("token-input");

  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", handleAnalyzeClick);
  }

  if (saveJobBtn) {
    saveJobBtn.addEventListener("click", handleSaveJobClick);
  }

  if (skillGapBtn) {
    skillGapBtn.addEventListener("click", handleSkillGapClick);
  }

  if (coverLetterBtn) {
    coverLetterBtn.addEventListener("click", handleCoverLetterClick);
  }

  if (autoApplyBtn) {
    autoApplyBtn.addEventListener("click", handleAutoApplyClick);
  }

  if (generateSearchBtn) {
    generateSearchBtn.addEventListener("click", handleGenerateSearchClick);
  }

  if (tokenInput) {
    const token = await getStoredToken();
    if (token) {
      tokenInput.value = token;
      setStatus("Token mil gaya. Ab jobs direct tumhare account me jayengi.", "ok");
    } else {
      setStatus("Optional: token save karoge to jobs directly tumhare user pe save hongi.");
    }
  }

  if (saveTokenBtn && tokenInput) {
    saveTokenBtn.addEventListener("click", async () => {
      await setStoredToken(tokenInput.value.trim());
      setStatus("Token save ho gaya. Ab se sab jobs tumhare user ke under jayengi.", "ok");
    });
  }
}

document.addEventListener("DOMContentLoaded", initPopup);

