"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

function validateEmail(value: string): string {
  if (!value) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address";
  return "";
}

function validatePassword(value: string): string {
  if (!value) return "Password is required";
  if (value.length < 4) return "Password must be at least 4 characters";
  return "";
}

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function getPasswordStrength(value: string): {
  score: StrengthLevel;
  label: string;
  color: string;
  bgColor: string;
} {
  if (!value) return { score: 0, label: "", color: "", bgColor: "" };

  let score: StrengthLevel = 0;
  if (value.length >= 6) score++;
  if (value.length >= 10) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  score = Math.min(score, 4) as StrengthLevel;

  const levels: Record<StrengthLevel, { label: string; color: string; bgColor: string }> = {
    0: { label: "", color: "", bgColor: "" },
    1: { label: "Weak", color: "text-[hsl(var(--color-error))]", bgColor: "bg-red-500" },
    2: { label: "Fair", color: "text-[hsl(var(--color-warning))]", bgColor: "bg-[hsl(var(--color-warning))]" },
    3: { label: "Good", color: "text-[hsl(var(--color-primary-strong))]", bgColor: "bg-[hsl(var(--color-primary-strong))]" },
    4: { label: "Strong", color: "text-[hsl(var(--color-success))]", bgColor: "bg-[hsl(var(--color-success))]" },
  };

  return { score, ...levels[score] };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successRole, setSuccessRole] = useState("");

  // Inline field errors
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Track if user has interacted with each field
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  useEffect(() => {
    // The entrance animation is suppressed on the server so the first paint is
    // not mid-transition, then enabled after hydration. A lazy useState
    // initialiser would run during SSR too and cause a hydration mismatch,
    // which is worse than the single extra render this costs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Validate on blur
  const handleEmailBlur = useCallback(() => {
    setEmailTouched(true);
    setEmailError(validateEmail(email));
  }, [email]);

  const handlePasswordBlur = useCallback(() => {
    setPasswordTouched(true);
    setPasswordError(validatePassword(password));
  }, [password]);

  // Clear inline errors as user types (if field was touched)
  const handleEmailChange = useCallback(
    (value: string) => {
      setEmail(value);
      if (emailTouched) setEmailError(validateEmail(value));
      setError("");
    },
    [emailTouched]
  );

  const handlePasswordChange = useCallback(
    (value: string) => {
      setPassword(value);
      if (passwordTouched) setPasswordError(validatePassword(value));
      setError("");
    },
    [passwordTouched]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validate all fields
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    setEmailTouched(true);
    setPasswordTouched(true);

    if (eErr || pErr) return;

    try {
      setLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: email, password }),
      });

      let data: { token?: string; error?: string; user?: { role?: string; name?: string } } = {};
      try {
        data = await response.json();
      } catch {
        data = { error: "An unexpected network error occurred." };
      }

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Token is set via Set-Cookie header from the server.
      const role = data.user?.role?.toUpperCase();
      const dest = role === "ADMIN" ? "/portal/admin" : role === "DEALER" ? "/portal/dealer" : "/dashboard";
      setSuccessRole(data.user?.name || "");
      setLoading(false);
      setShowSuccess(true);
      // Show success animation then redirect
      setTimeout(() => {
        router.push(dest);
      }, 1800);
      return;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  const emailHasError = emailTouched && emailError;
  const passwordHasError = passwordTouched && passwordError;
  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-glass-scene flex">
      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-6 animate-fade-in-up">
            {/* Animated checkmark circle */}
            <div className="relative">
              {/* Outer ring pulse */}
              <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[hsl(var(--color-primary))] to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                <svg className="w-14 h-14 text-[hsl(var(--color-primary-foreground))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" className="checkmark-path" />
                </svg>
              </div>
            </div>
            {/* Success text */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-1">Welcome{successRole ? `, ${successRole}` : ""}!</h3>
              <p className="text-white/70 text-sm">Login successful — redirecting...</p>
            </div>
          </div>
        </div>
      )}

      {/* Left Panel: Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse-slow" />
          <div
            className="absolute bottom-32 right-16 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-pulse-slow"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-400/15 rounded-full blur-3xl animate-pulse-slow"
            style={{ animationDelay: "2s" }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="animate-fade-in-up">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <svg
                  className="w-7 h-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <span className="text-2xl font-bold tracking-tight">AutoHub</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl font-bold leading-tight mb-6">
              Your Premium
              <br />
              Automotive
              <br />
              <span className="text-emerald-200">Marketplace</span>
            </h1>

            <p className="text-lg text-white/80 max-w-md leading-relaxed mb-12">
              Buy and sell pre-owned cars with recorded inspections and a
              transparent price. Every listing shows exactly what has and has
              not been verified.
            </p>

            {/* No invented metrics: what the platform actually does. */}
            <ul className="flex flex-col gap-3 text-sm text-white/75">
              <li>Recorded inspections on every listing</li>
              <li>Ownership, insurance and PUC history where available</li>
              <li>Unverified items are labelled, never presented as clean</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div
          className={`w-full max-w-md transition-all duration-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <svg className="w-6 h-6 text-[hsl(var(--color-primary-foreground))]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-[hsl(var(--color-content))]">AutoHub</span>
            </div>
          </div>

          {/* Login Card */}
          <div className="glass-strong rounded-3xl p-8 sm:p-10">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-[hsl(var(--color-content))] tracking-tight">
                Welcome back
              </h2>
              <p className="text-[hsl(var(--color-content-muted))] mt-2">
                Sign in to your account to continue
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-[hsl(var(--color-error)/0.08)] border border-[hsl(var(--color-error)/0.3)] flex items-start gap-3 animate-fade-in">
                <svg
                  className="w-5 h-5 text-[hsl(var(--color-error))] mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
                <button
                  onClick={() => setError("")}
                  className="text-[hsl(var(--color-error))] hover:text-[hsl(var(--color-error))] transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Social Login */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] hover:bg-[hsl(var(--color-surface-strong))] hover:border-[hsl(var(--color-line-hover))] transition-all duration-200 text-sm font-medium text-[hsl(var(--color-content))]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.27-2.23.43-3.71.43-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] hover:bg-[hsl(var(--color-surface-strong))] hover:border-[hsl(var(--color-line-hover))] transition-all duration-200 text-sm font-medium text-[hsl(var(--color-content))]"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                X
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[hsl(var(--color-line))]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[hsl(var(--color-surface))] text-[hsl(var(--color-content-muted))]">
                  or sign in with email
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-[hsl(var(--color-content))] mb-2"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg
                      className={`w-5 h-5 transition-colors duration-200 ${
                        emailHasError ? "text-[hsl(var(--color-error))]" : "text-[hsl(var(--color-content-muted))]"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={handleEmailBlur}
                    className={`w-full pl-12 pr-4 py-3.5 rounded-xl border bg-[hsl(var(--color-surface))] focus:bg-[hsl(var(--color-surface-strong))] outline-none transition-all duration-200 text-[hsl(var(--color-content))] placeholder:text-[hsl(var(--color-content-faint))] ${
                      emailHasError
                        ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-[hsl(var(--color-line))] focus:border-[hsl(var(--color-primary))] focus:ring-4 focus:ring-[hsl(var(--color-focus)/0.12)]"
                    }`}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
                {/* Inline error */}
                <div
                  className={`mt-1.5 overflow-hidden transition-all duration-200 ${
                    emailHasError ? "max-h-8 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="text-sm text-[hsl(var(--color-error))] flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {emailError}
                  </p>
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-[hsl(var(--color-content))] mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg
                      className={`w-5 h-5 transition-colors duration-200 ${
                        passwordHasError ? "text-[hsl(var(--color-error))]" : "text-[hsl(var(--color-content-muted))]"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                      />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    onBlur={handlePasswordBlur}
                    className={`w-full pl-12 pr-12 py-3.5 rounded-xl border bg-[hsl(var(--color-surface))] focus:bg-[hsl(var(--color-surface-strong))] outline-none transition-all duration-200 text-[hsl(var(--color-content))] placeholder:text-[hsl(var(--color-content-faint))] ${
                      passwordHasError
                        ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-[hsl(var(--color-line))] focus:border-[hsl(var(--color-primary))] focus:ring-4 focus:ring-[hsl(var(--color-focus)/0.12)]"
                    }`}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[hsl(var(--color-content-muted))] hover:text-[hsl(var(--color-content))] transition-colors"
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {/* Inline error */}
                <div
                  className={`mt-1.5 overflow-hidden transition-all duration-200 ${
                    passwordHasError ? "max-h-8 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="text-sm text-[hsl(var(--color-error))] flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {passwordError}
                  </p>
                </div>

                {/* Password Strength Meter */}
                {password.length > 0 && !passwordHasError && (
                  <div className="mt-2 animate-fade-in">
                    {/* Strength bar */}
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-1.5 flex-1 rounded-full bg-[hsl(var(--color-line))] overflow-hidden transition-colors duration-300"
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                              i <= passwordStrength.score
                                ? passwordStrength.bgColor
                                : ""
                            }`}
                            style={{
                              width: i <= passwordStrength.score ? "100%" : "0%",
                              transitionDelay: `${(i - 1) * 80}ms`,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    {/* Strength label */}
                    <div className="flex items-center justify-between mt-1.5">
                      <p className={`text-xs font-medium ${passwordStrength.color}`}>
                        {passwordStrength.label}
                      </p>
                      <p className="text-xs text-[hsl(var(--color-content-muted))]">
                        {password.length}/8+ characters
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[hsl(var(--color-line))] text-[hsl(var(--color-success))] focus:ring-[hsl(var(--color-focus)/0.3)]"
                  />
                  <span className="text-sm text-[hsl(var(--color-content-muted))]">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-[hsl(var(--color-primary-strong))] hover:text-[hsl(var(--color-primary-active))] transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-success w-full gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Sign up link */}
            <p className="mt-8 text-center text-sm text-[hsl(var(--color-content-muted))]">
              Don&apos;t have an account?{" "}
              <button className="font-semibold text-[hsl(var(--color-primary-strong))] hover:text-[hsl(var(--color-primary-active))] transition-colors">
                Create one now
              </button>
            </p>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-[hsl(var(--color-content-muted))]">
            By signing in, you agree to our{" "}
            <button className="underline hover:text-[hsl(var(--color-content-muted))] transition-colors">
              Terms of Service
            </button>{" "}
            and{" "}
            <button className="underline hover:text-[hsl(var(--color-content-muted))] transition-colors">
              Privacy Policy
            </button>
          </p>
        </div>
      </div>

      {/* Checkmark draw animation styles */}
      <style>{`
        .checkmark-path {
          stroke-dasharray: 24;
          stroke-dashoffset: 24;
          animation: draw-check 0.5s ease-out 0.3s forwards;
        }
        @keyframes draw-check {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
