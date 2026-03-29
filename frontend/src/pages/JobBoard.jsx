import React from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useApp } from '../context/AppContext';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || "";

function SortableJobItem({ id, job, onOpenEmail }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 mb-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-sm border ${
        isDragging ? "border-violet-500 shadow-xl ring-2 ring-violet-500/20" : "border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md"
      } transition-all duration-200 ease-in-out group`}
    >
      <div className="flex justify-between items-start">
        <div {...attributes} {...listeners} className="flex-1 cursor-grab active:cursor-grabbing">
          <div className="font-semibold text-slate-800 dark:text-slate-100">{job.title || "Untitled Job"}</div>
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{job.company || "Unknown Company"}</div>
        </div>
        <button 
          onClick={() => onOpenEmail(job)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors"
          title="Draft Cold Email"
        >
          ✉️
        </button>
      </div>
      
      {job.location && (
        <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
          <span>📍</span> {job.location}
        </div>
      )}
    </div>
  );
}

function Column({ id, title, jobs, onOpenEmail }) {
  const { setNodeRef } = useDroppable({ id });
  
  return (
    <div ref={setNodeRef} className="flex flex-col flex-1 min-w-[300px] w-[300px] bg-slate-100/50 dark:bg-slate-900/50 rounded-3xl p-5 border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
      <div className="flex justify-between items-center mb-5 px-1">
        <h2 className="font-bold text-slate-700 dark:text-slate-200 capitalize flex items-center gap-2">
          {title === 'saved' && '📌 '}
          {title === 'applied' && '🚀 '}
          {title === 'interview' && '🎯 '}
          {title === 'offer' && '🎉 '}
          {title === 'rejected' && '🛑 '}
          {title}
        </h2>
        <span className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
          {jobs.length}
        </span>
      </div>
      <SortableContext items={jobs.map(j => j._id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 min-h-[150px] flex flex-col">
          {jobs.map(job => (
            <SortableJobItem key={job._id} id={job._id} job={job} onOpenEmail={onOpenEmail} />
          ))}
          {jobs.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-xs uppercase tracking-widest font-bold border-2 border-dashed border-slate-300/50 dark:border-slate-700/50 rounded-2xl text-slate-400 dark:text-slate-500 mt-2 p-8 text-center transition-colors">
              Drop Here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

const STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected'];

export default function JobBoard() {
  const { jobs, setJobs } = useApp();
  const [emailModal, setEmailModal] = useState({ open: false, job: null });
  const [draft, setDraft] = useState({ email: "", subject: "", body: "", status: "", previewUrl: "" });
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeId = active.id;
    const overId = over.id;

    let activeJob = jobs.find(j => j._id === activeId);
    if (!activeJob) return;

    let targetStatus = null;

    if (STATUSES.includes(overId)) {
      targetStatus = overId;
    } else {
       const overJob = jobs.find(j => j._id === overId);
       if (overJob) {
           targetStatus = overJob.status;
       }
    }

    if (targetStatus && targetStatus !== activeJob.status) {
      // Optimistic update
      setJobs(prev => prev.map(j => j._id === activeId ? { ...j, status: targetStatus } : j));
      
      try {
        const token = localStorage.getItem("token");
        await axios.patch(`${API_BASE}/api/jobs/${activeId}`, { status: targetStatus }, {
           headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Failed to update status", err);
      }
    }
  };

  const handleOpenEmail = async (job) => {
    setEmailModal({ open: true, job });
    setDraft({ email: "", subject: "", body: "Generating with AI...", status: "generating", previewUrl: "" });
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/api/email/draft`, { jobId: job._id }, {
         headers: { Authorization: `Bearer ${token}` }
      });
      const generated = res.data.draft || "";
      let subj = "";
      let bdy = generated;
      
      const lines = generated.split("\n");
      if (lines[0].toLowerCase().startsWith("subject:")) {
         subj = lines[0].replace(/subject:/i, "").trim();
         bdy = lines.slice(1).join("\n").trim();
      } else {
         subj = `Application for ${job.title} role`;
      }
      
      setDraft(p => ({ ...p, subject: subj, body: bdy, status: "ready" }));
    } catch (err) {
      setDraft(p => ({ ...p, subject: "", body: "Failed to generate draft. Check your GEMINI_API_KEY.", status: "error" }));
    }
  };

  const handleSendEmail = async () => {
    setDraft(p => ({ ...p, status: "sending" }));
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/api/email/send`, { 
        to: draft.email || "recruiter@example.com",
        subject: draft.subject,
        body: draft.body
      }, {
         headers: { Authorization: `Bearer ${token}` }
      });
      
      setDraft(p => ({ ...p, status: "success", previewUrl: res.data.preview }));
    } catch (err) {
      setDraft(p => ({ ...p, status: "error_send" }));
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full min-h-[calc(100vh-6rem)] relative">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent md:text-4xl">Kanban Board</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm md:text-base font-medium">Drag and drop to track your application process seamlessly.</p>
      </div>
      
      <div className="flex-1 overflow-x-auto pb-6 custom-scrollbar">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="flex gap-5 h-full min-w-max px-2 py-2">
              {STATUSES.map(status => {
                const columnJobs = jobs.filter(j => j.status === status);
                return <Column key={status} id={status} title={status} jobs={columnJobs} onOpenEmail={handleOpenEmail} />;
              })}
            </div>
        </DndContext>
      </div>

      {emailModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Cold Email</h2>
              <button onClick={() => setEmailModal({ open: false, job: null })} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl dark:hover:bg-slate-800">
                ✕
              </button>
            </div>
            
            <p className="text-sm text-slate-500 -mt-2">For {emailModal.job.company} - {emailModal.job.title}</p>

            <input 
              value={draft.email}
              onChange={(e) => setDraft(p => ({ ...p, email: e.target.value }))}
              placeholder="Recruiter Email (e.g. hr@company.com)" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />

            <input 
              value={draft.subject}
              onChange={(e) => setDraft(p => ({ ...p, subject: e.target.value }))}
              placeholder="Subject Line" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />

            <textarea 
              value={draft.body}
              onChange={(e) => setDraft(p => ({ ...p, body: e.target.value }))}
              rows="6"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none"
            ></textarea>

            <button 
              onClick={handleSendEmail}
              disabled={draft.status === "generating" || draft.status === "sending"}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition"
            >
              {draft.status === "generating" ? "Generating..." : 
               draft.status === "sending" ? "Sending..." : "🚀 Send Email"}
            </button>

            {draft.previewUrl && (
              <a href={draft.previewUrl} target="_blank" rel="noreferrer" className="text-center text-sm text-blue-500 hover:underline">
                View Ethereal (Test) Email Preview
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
