import { useAuth } from "../context/AuthContext";
import { Mail, ShieldCheck, User, Phone, Lock, X, ArrowRight, Loader2 } from "lucide-react";

export default function AuthModal() {
  const {
    authMode,
    setAuthMode,
    authForm,
    authError,
    authLoading,
    showAuthModal,
    setShowAuthModal,
    handleAuthChange,
    handleAuthSubmit,
    pendingVerificationEmail,
    verificationCode,
    setVerificationCode,
    handleVerifyCode,
    handleResendCode,
    verifyLoading,
    resendLoading,
    closeVerificationStep,
  } = useAuth();

  if (!showAuthModal) return null;

  const showVerifyStep = !!pendingVerificationEmail;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Dim & Blur Overlay */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/60"
        onClick={() => { setShowAuthModal(false); if (showVerifyStep) closeVerificationStep(); }}
      ></div>

      {/* Main Modal Container */}
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        
        {/* Glow effect */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-blue-500/30 blur-xl"></div>
        
        {/* Modal Card */}
        <div className="relative rounded-[2rem] border border-white/20 bg-white/70 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
          
          {/* Close Button */}
          <button
            type="button"
            onClick={() => { setShowAuthModal(false); if (showVerifyStep) closeVerificationStep(); }}
            className="absolute right-6 top-6 rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="mb-8 mt-2 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/30">
              {showVerifyStep ? <ShieldCheck className="h-7 w-7 text-white" /> : <Lock className="h-7 w-7 text-white" />}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
              {showVerifyStep
                ? "Verify Email"
                : authMode === "signup"
                ? "Create Account"
                : "Welcome Back"}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {showVerifyStep
                ? `Enter the 6-digit code sent to ${pendingVerificationEmail}`
                : "Unlock AI analysis, cover letters & seamless tracking."}
            </p>
          </div>

          {showVerifyStep ? (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <div className="relative mt-2 flex justify-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="------"
                    className="w-full rounded-2xl border-2 border-transparent bg-slate-100 py-4 text-center text-3xl tracking-[0.6em] text-slate-800 transition-all focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/20 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>
              
              {authError && (
                <div className={`rounded-xl px-4 py-3 text-sm ${authError.includes("Code sent") ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"}`}>
                  {authError}
                </div>
              )}
              
              <button
                type="submit"
                disabled={verifyLoading || verificationCode.length !== 6}
                className="group w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 font-semibold text-white shadow-xl shadow-fuchsia-500/20 transition-all hover:shadow-violet-500/40 disabled:opacity-50"
              >
                <div className="flex items-center justify-center gap-2">
                  {verifyLoading ? <Loader2 className="animate-spin" size={20} /> : "Verify Code"}
                  {!verifyLoading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
                </div>
              </button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendLoading}
                  className="text-sm font-medium text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400"
                >
                  {resendLoading ? "Sending..." : "Didn't receive a code? Resend"}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Tab Selector */}
              <div className="mb-8 flex rounded-xl bg-slate-100/80 p-1 dark:bg-slate-800/80">
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setAuthError(""); }}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-300 ${
                    authMode === "login"
                      ? "bg-white text-violet-600 shadow-md dark:bg-slate-700 dark:text-violet-400"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("signup"); setAuthError(""); }}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-300 ${
                    authMode === "signup"
                      ? "bg-white text-violet-600 shadow-md dark:bg-slate-700 dark:text-violet-400"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === "signup" && (
                  <div className="group relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-violet-500" size={18} />
                    <input
                      type="text"
                      className="w-full rounded-2xl border-2 border-transparent bg-slate-100 py-3.5 pl-11 pr-4 text-sm text-slate-800 transition-all focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/20 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                      value={authForm.name}
                      onChange={(e) => handleAuthChange("name", e.target.value)}
                      placeholder="Full Name"
                    />
                  </div>
                )}
                
                <div className="group relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-violet-500" size={18} />
                  <input
                    type="email"
                    className="w-full rounded-2xl border-2 border-transparent bg-slate-100 py-3.5 pl-11 pr-4 text-sm text-slate-800 transition-all focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/20 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                    value={authForm.email}
                    onChange={(e) => handleAuthChange("email", e.target.value)}
                    placeholder="Email Address"
                  />
                </div>

                {authMode === "signup" && (
                  <div className="group relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-violet-500" size={18} />
                    <input
                      type="tel"
                      className="w-full rounded-2xl border-2 border-transparent bg-slate-100 py-3.5 pl-11 pr-4 text-sm text-slate-800 transition-all focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/20 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                      value={authForm.phone || ""}
                      onChange={(e) => handleAuthChange("phone", e.target.value)}
                      placeholder="Phone Number (Optional)"
                    />
                  </div>
                )}
                
                <div className="group relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-violet-500" size={18} />
                  <input
                    type="password"
                    className="w-full rounded-2xl border-2 border-transparent bg-slate-100 py-3.5 pl-11 pr-4 text-sm text-slate-800 transition-all focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/20 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                    value={authForm.password}
                    onChange={(e) => handleAuthChange("password", e.target.value)}
                    placeholder="Password"
                  />
                </div>

                {authError && (
                  <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="group mt-6 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 font-semibold text-white shadow-xl shadow-fuchsia-500/20 transition-all hover:shadow-violet-500/40 disabled:opacity-50"
                >
                  <div className="flex items-center justify-center gap-2">
                    {authLoading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : authMode === "signup" ? (
                      "Sign Up & Continue"
                    ) : (
                      "Log In"
                    )}
                    {!authLoading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
                  </div>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
