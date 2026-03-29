import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import StatCard from "../components/StatCard";

const STATUS_COLORS = {
  saved: "#6366f1",
  applied: "#3b82f6",
  interview: "#10b981",
  offer: "#f59e0b",
  rejected: "#ef4444",
};

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { jobs, resume } = useApp();
  const [githubUser, setGithubUser] = useState("");
  const [githubData, setGithubData] = useState(null);

  const fetchGithub = async () => {
    if (!githubUser.trim()) return;
    try {
      const res = await fetch(`https://api.github.com/users/${githubUser.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setGithubData(data);
      } else {
        setGithubData({ error: 'User not found' });
      }
    } catch (e) {
      setGithubData({ error: 'Network error' });
    }
  };

  const statusCounts = jobs.reduce((acc, j) => {
    acc[j.status] = (acc[j.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: STATUS_COLORS[name] || "#94a3b8",
  }));

  const barData = Object.entries(statusCounts).map(([name, value]) => ({
    status: name.charAt(0).toUpperCase() + name.slice(1),
    count: value,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Overview of your job search and AI tools.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tracked Jobs"
          value={jobs.length}
          subtitle="In your pipeline"
          icon="📋"
        />
        <StatCard
          title="Resume"
          value={resume ? "Uploaded" : "Not uploaded"}
          subtitle={resume ? resume.originalName : "Upload to enable AI tools"}
          icon="📄"
        />
        <StatCard
          title="Applied"
          value={statusCounts.applied || 0}
          subtitle="Applications sent"
          icon="✉️"
        />
        <StatCard
          title="Interviews"
          value={statusCounts.interview || 0}
          subtitle="In progress"
          icon="🎯"
        />
      </div>

      {/* GitHub Integration Section */}
      <div className="rounded-2xl border border-slate-200 bg-white/60 backdrop-blur-md p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/60 hover:shadow-lg transition-transform hover:-translate-y-1">
         <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
           <div>
             <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
               <svg height="24" width="24" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
               GitHub Analytics
             </h2>
             <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Link your GitHub to showcase your coding stats to AI</p>
           </div>
           
           <div className="flex gap-2 w-full sm:w-auto">
             <input type="text" placeholder="GitHub Username" value={githubUser} onChange={(e) => setGithubUser(e.target.value)} className="w-full sm:w-64 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none" />
             <button onClick={fetchGithub} className="bg-slate-900 text-white dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-300 dark:text-slate-900 px-5 py-2 rounded-lg font-bold shadow-md transition">Connect</button>
           </div>
         </div>
         
         {githubData && !githubData.error && (
            <div className="mt-6 flex flex-col md:flex-row items-center gap-6 border-t border-slate-100 dark:border-slate-800 pt-5">
               <img src={githubData.avatar_url} alt="GitHub Profile" className="w-16 h-16 rounded-full ring-2 ring-violet-500 shadow-lg" />
               <div className="flex-1 text-center md:text-left">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">{githubData.name || githubUser}</h3>
                  <a href={githubData.html_url} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline">@{githubData.login}</a>
               </div>
               <div className="grid grid-cols-3 gap-6 flex-1 text-center border-l-0 md:border-l border-slate-100 dark:border-slate-800 md:pl-6">
                 <div>
                   <div className="text-2xl font-black text-slate-800 dark:text-white">{githubData.public_repos}</div>
                   <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Repos</div>
                 </div>
                 <div>
                   <div className="text-2xl font-black text-slate-800 dark:text-white">{githubData.followers}</div>
                   <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Followers</div>
                 </div>
                 <div>
                   <div className="text-2xl font-black text-slate-800 dark:text-white">{githubData.public_gists}</div>
                   <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Gists</div>
                 </div>
               </div>
            </div>
         )}
         {githubData?.error && <p className="mt-4 text-red-500 text-sm font-medium">{githubData.error}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Applications by status
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Distribution of your tracked jobs
          </p>
          <div className="mt-4 h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                Add jobs in Job Analyzer to see chart
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Status breakdown
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Count per stage
          </p>
          <div className="mt-4 h-64">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                No data yet
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Quick actions
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Get started with AI-powered job tools
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/resume"
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:hover:border-violet-700 dark:hover:bg-violet-900/20"
          >
            <span className="text-2xl">📄</span>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Resume Analyzer</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Upload & parse resume</p>
            </div>
          </Link>
          <Link
            to="/job-analyzer"
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:hover:border-violet-700 dark:hover:bg-violet-900/20"
          >
            <span className="text-2xl">🔍</span>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Job Analyzer</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Match score vs JD</p>
            </div>
          </Link>
          <Link
            to="/cover-letter"
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:hover:border-violet-700 dark:hover:bg-violet-900/20"
          >
            <span className="text-2xl">✉️</span>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Cover Letter</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Generate tailored letter</p>
            </div>
          </Link>
          <Link
            to="/skill-gap"
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:hover:border-violet-700 dark:hover:bg-violet-900/20"
          >
            <span className="text-2xl">📈</span>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Skill Gap</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Missing skills & tips</p>
            </div>
          </Link>
        </div>
      </div>

      {!currentUser && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Sign in to save jobs, run AI analysis, and generate cover letters.
          </p>
        </div>
      )}
    </div>
  );
}
