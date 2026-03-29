import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem("aj_token");
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      axios
        .get(`${API_BASE}/api/auth/me`)
        .then((res) => setCurrentUser(res.data.user))
        .catch(() => {
          window.localStorage.removeItem("aj_token");
          delete axios.defaults.headers.common.Authorization;
          setCurrentUser(null);
        });
    }
  }, []);

  const handleAuthChange = (field, value) => {
    setAuthForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      if (authMode === "login") {
        const res = await axios.post(`${API_BASE}/api/auth/login`, {
          email: authForm.email,
          password: authForm.password,
        });
        if (res.data.needVerification) {
          setPendingVerificationEmail(res.data.email);
          setAuthError(res.data.error || "Verify your email first.");
          setAuthLoading(false);
          return;
        }
        const { token, user } = res.data;
        window.localStorage.setItem("aj_token", token);
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        setCurrentUser(user);
        setShowAuthModal(false);
        setAuthLoading(false);
        return;
      }

      const res = await axios.post(`${API_BASE}/api/auth/signup`, {
        name: authForm.name,
        email: authForm.email,
        password: authForm.password,
        phone: authForm.phone || undefined,
      });
      if (res.data.needVerification) {
        setPendingVerificationEmail(res.data.email);
        setVerificationCode("");
        setAuthError("");
        setAuthLoading(false);
        return;
      }
      const { token, user } = res.data;
      window.localStorage.setItem("aj_token", token);
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      setCurrentUser(user);
      setShowAuthModal(false);
    } catch (e) {
      let msg = e.response?.data?.error || e.response?.data?.message || e.message || "Authentication failed";
      if (e.code === "ERR_NETWORK" || e.response?.status === 502) {
        msg = "Backend nahi chal raha. Pehle backend start karein: cd backend → npm run dev";
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    if (!pendingVerificationEmail || !verificationCode.trim()) return;
    setAuthError("");
    setVerifyLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/verify`, {
        email: pendingVerificationEmail,
        code: verificationCode.trim(),
      });
      const { token, user } = res.data;
      window.localStorage.setItem("aj_token", token);
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      setCurrentUser(user);
      setShowAuthModal(false);
      setPendingVerificationEmail(null);
      setVerificationCode("");
    } catch (e) {
      const msg = e.response?.status === 502 || e.code === "ERR_NETWORK"
        ? "Backend nahi chal raha. cd backend → npm run dev"
        : (e.response?.data?.error || "Invalid or expired code");
      setAuthError(msg);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!pendingVerificationEmail) return;
    setAuthError("");
    setResendLoading(true);
    try {
      await axios.post(`${API_BASE}/api/auth/resend-code`, { email: pendingVerificationEmail });
      setAuthError("Code sent! Check your email.");
      setTimeout(() => setAuthError(""), 4000);
    } catch (e) {
      const msg = e.response?.status === 502 || e.code === "ERR_NETWORK"
        ? "Backend nahi chal raha. cd backend → npm run dev"
        : (e.response?.data?.error || "Failed to resend code");
      setAuthError(msg);
    } finally {
      setResendLoading(false);
    }
  };

  const closeVerificationStep = () => {
    setPendingVerificationEmail(null);
    setVerificationCode("");
    setAuthError("");
  };

  const handleLogout = () => {
    window.localStorage.removeItem("aj_token");
    delete axios.defaults.headers.common.Authorization;
    setCurrentUser(null);
  };

  const openLogin = () => {
    setAuthMode("login");
    setAuthError("");
    setShowAuthModal(true);
  };

  const openSignup = () => {
    setAuthMode("signup");
    setAuthError("");
    setShowAuthModal(true);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authMode,
        setAuthMode,
        authForm,
        authError,
        setAuthError,
        authLoading,
        showAuthModal,
        setShowAuthModal,
        handleAuthChange,
        handleAuthSubmit,
        handleLogout,
        openLogin,
        openSignup,
        pendingVerificationEmail,
        verificationCode,
        setVerificationCode,
        handleVerifyCode,
        handleResendCode,
        verifyLoading,
        resendLoading,
        closeVerificationStep,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
