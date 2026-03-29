import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || "";

function PortfolioBuilder() {
  const { currentUser } = useAuth();
  const [htmlCode, setHtmlCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/api/ai/generate-portfolio`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHtmlCode(res.data.html || "");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to generate portfolio. Make sure AI Key is set and resume is uploaded.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSource = () => {
    if (!htmlCode) return;
    const blob = new Blob([htmlCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Portfolio_${currentUser.name || 'Site'}.html`.replace(/\s+/g, '_');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] relative space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent md:text-4xl">
            1-Click Portfolio Builder
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400 font-medium">Instantly convert your parsed resume into a stunning, deploy-ready React/Tailwind website.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {htmlCode && (
            <button
              onClick={downloadSource}
              className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-colors flex items-center gap-2"
            >
              📥 Download .HTML
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isLoading || !currentUser}
            className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-pink-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? "⏳ Generating..." : "⚡ Build My Website"}
          </button>
        </div>
      </div>

      {!currentUser && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-center font-medium shadow-sm">
          Sign in and upload a resume to generate your custom AI portfolio website!
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm shadow-sm font-medium">
          ❌ {error}
        </div>
      )}

      <div className="flex-1 bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden backdrop-blur-md relative">
        {!htmlCode && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-8 text-center bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-6xl mb-6 opacity-80">🌐</span>
            <h2 className="text-2xl font-bold mb-2">Live Preview Sandbox</h2>
            <p className="max-w-md">Click "Build My Website" to unleash the AI. It will generate thousands of lines of code and render the live website right here.</p>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
            <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white animate-pulse">AI is writing your exact code...</h2>
            <p className="text-slate-500 mt-2">Writing HTML... Injecting Tailwind CSS... Optimizing Layout...</p>
          </div>
        )}

        {htmlCode && (
          <iframe
            srcDoc={htmlCode}
            title="Generated Portfolio Preview"
            className="w-full h-full border-none bg-white"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        )}
      </div>
    </div>
  );
}

export default PortfolioBuilder;
