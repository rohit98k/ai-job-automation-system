import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || "";

function MockInterview() {
  const { jobs } = useApp();
  const { currentUser } = useAuth();
  
  const [selectedJobId, setSelectedJobId] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      
      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            setMessage((prev) => prev + event.results[i][0].transcript + " ");
          }
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListen = (e) => {
    e.preventDefault();
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (recognitionRef.current) {
        setMessage(""); // Clear message before new dictation for smooth UX
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        alert("Speech recognition is not supported in this browser. Try Chrome.");
      }
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);

  const handleStart = () => {
    setChatHistory([{
      role: 'model',
      text: "Hello! Let's get started with the interview. Could you please introduce yourself and tell me a bit about your background?"
    }]);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!message.trim() || !selectedJobId || isLoading) return;

    const userMessage = { role: 'user', text: message };
    const currentHistory = [...chatHistory, userMessage];
    
    setChatHistory(currentHistory);
    setMessage("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_BASE}/api/ai/interview`, {
        jobId: selectedJobId,
        message: userMessage.text,
        chatHistory: chatHistory // Send previous messages for context
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setChatHistory(prev => [...prev, { role: 'model', text: res.data.reply }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'model', text: "Sorry, I lost my connection. Could you repeat that?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-amber-800 font-medium text-lg">Sign in to practice mock interviews!</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-100px)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent md:text-4xl">
          AI Interview Coach
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400 font-medium">Practice answering questions tailored to your specific job applications.</p>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg flex flex-col overflow-hidden">
        {chatHistory.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center p-8 text-center bg-slate-50/50 dark:bg-slate-900/50">
            <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
              🤖
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Start a Mock Session</h2>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl px-4 py-3 mb-6 w-full max-w-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-sm"
            >
              <option value="">-- Select a Job to Practice For --</option>
              {jobs.map(j => (
                <option key={j._id} value={j._id}>{j.title} at {j.company}</option>
              ))}
            </select>
            <button
              onClick={handleStart}
              disabled={!selectedJobId}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-teal-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
            >
              Start Interview Let's Go!
            </button>
          </div>
        ) : (
          <>
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50 dark:bg-slate-950/20">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-5 py-3.5 shadow-md ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-sm' 
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-sm'
                  }`}>
                    {msg.role === 'model' && <div className="text-xs font-bold text-teal-600 dark:text-teal-400 mb-1">AI Coach</div>}
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-2">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce delay-100">●</span>
                    <span className="animate-bounce delay-200">●</span>
                  </div>
                </div>
              )}
              <div ref={endOfMessagesRef} />
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <form onSubmit={handleSend} className="flex gap-3 max-w-4xl mx-auto items-center">
                <button
                  type="button"
                  onClick={toggleListen}
                  className={`p-4 rounded-full flex-shrink-0 transition-all shadow-md active:scale-95 ${
                    isListening 
                    ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                  title={isListening ? "Stop Listening" : "Start Voice Answer"}
                >
                  {isListening ? "🛑" : "🎙️"}
                </button>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={isListening ? "Listening... Speak now!" : "Type or speak your answer here..."}
                  disabled={isLoading}
                  className="flex-1 bg-slate-100 dark:bg-slate-800/50 border-0 text-slate-800 dark:text-slate-100 rounded-xl px-5 py-3.5 focus:ring-2 focus:ring-violet-500 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={isLoading || !message.trim()}
                  className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3.5 flex-shrink-0 rounded-xl font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  Send <span>📤</span>
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MockInterview;
