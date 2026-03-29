import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

const API_BASE = import.meta.env.VITE_API_URL || "";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { currentUser } = useAuth();
  const [resume, setResume] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [jobDescription, setJobDescription] = useState("");

  useEffect(() => {
    if (!currentUser) {
      setJobs([]);
      setResume(null);
      return;
    }
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

  const refreshJobs = async () => {
    if (!currentUser) return;
    try {
      const res = await axios.get(`${API_BASE}/api/jobs`);
      setJobs(res.data.jobs || []);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppContext.Provider
      value={{
        resume,
        setResume,
        jobs,
        setJobs,
        refreshJobs,
        jobDescription,
        setJobDescription,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
