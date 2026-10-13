"use client";

import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

function InputField({ icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode }) {
  return (
    <div className="relative w-full">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--color-content-muted))] pointer-events-none">
        {icon}
      </div>
      <input
        {...props}
        className="w-full h-14 pl-12 pr-12 border border-[hsl(var(--color-line))] rounded-xl bg-[hsl(var(--color-surface))] text-[hsl(var(--color-content))] placeholder:text-[hsl(var(--color-content-faint))] focus:outline-none focus:ring-2 focus:ring-4 focus:ring-[hsl(var(--color-focus)/0.12)] focus:border-[hsl(var(--color-primary))] transition"
      />
    </div>
  );
}

export default function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Per-input errors (client pre-check + echoed server `field`/`issues`).
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<{ firstName: string; lastName: string; email: string; password: string; confirmPassword: string }>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});

    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    // Client pre-check mirroring the server schema (username, email, password)
    // so obvious mismatches never round-trip to /api/auth/register.
    const errors: Record<string, string> = {};
    const base = (form.firstName + form.lastName).toLowerCase().replace(/[^a-z0-9_.]/g, "");
    const username = (base.length >= 3 ? base : form.email.split("@")[0]) || "member";
    if (!/^[a-zA-Z0-9_.]+$/.test(username) || username.length < 3 || username.length > 30) {
      errors.username = "Username needs 3-30 letters, numbers, dot or underscore";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Enter a valid email address";
    }
    if (form.password.length < 8 || form.password.length > 72) {
      errors.password = "Use at least 8 characters (max 72)";
    }
    if (form.firstName.trim() === "" || form.lastName.trim() === "") {
      errors.name = "First and last name are required";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Schema requires `username` and `name`; the form collects first/last name,
    // so derive them here (the server keeps `username` a required field).
    const payload = {
      username,
      email: form.email,
      name: [form.firstName, form.lastName].filter(Boolean).join(" ").trim(),
      password: form.password,
      role: "CUSTOMER",
    };

    try {
      setLoading(true);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: { error?: string; message?: string; field?: string; issues?: { field?: string; message?: string }[] } = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        const msg = data.error || "Registration failed";
        // Map the server's failing field onto the matching UI input.
        const serverField = data.field;
        const inputKey =
          serverField === "username" || serverField === "name" ? "firstName"
          : serverField === "email" ? "email"
          : serverField === "password" ? "password"
          : undefined;
        if (inputKey) {
          const first = data.issues?.find((i) => i.field === serverField);
          setFieldErrors({ [inputKey]: first?.message || msg });
        } else if (data.issues && data.issues.length > 0) {
          setError(`${msg}: ${data.issues.map((i) => (i.field ? `${i.field} — ${i.message}` : i.message)).join("; ")}`);
        } else {
          setError(msg);
        }
        return;
      }

      setSuccess(data.message || "Account created successfully");
      setForm({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-[hsl(var(--color-card))] rounded-3xl shadow-[var(--shadow-elevated)] border border-[hsl(var(--color-line))] p-10">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-[hsl(var(--color-content))]">Create Account</h1>
        <p className="text-[hsl(var(--color-content-muted))] mt-2">
          Join Progressive AutoHub to buy, sell and finance vehicles.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 text-[hsl(var(--color-success))] p-4 rounded-xl">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <InputField
            icon={<ShieldCheck size={20} />}
            name="firstName"
            placeholder="First Name"
            value={form.firstName}
            onChange={handleChange}
            required
          />
          <InputField
            icon={<ShieldCheck size={20} />}
            name="lastName"
            placeholder="Last Name"
            value={form.lastName}
            onChange={handleChange}
            required
          />
        </div>

        {(fieldErrors.name || fieldErrors.username) && (
          <p className="text-sm text-red-400 -mt-2">{fieldErrors.name || fieldErrors.username}</p>
        )}

        <InputField
          icon={<Mail size={20} />}
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        {fieldErrors.email && <p className="text-sm text-red-400 -mt-1">{fieldErrors.email}</p>}

        <div className="relative">
          <InputField
            icon={<Lock size={20} />}
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[hsl(var(--color-content-muted))] hover:text-[hsl(var(--color-content))] focus:outline-none z-10"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {fieldErrors.password && <p className="text-sm text-red-400 -mt-1">{fieldErrors.password}</p>}

        <div className="relative">
          <InputField
            icon={<Lock size={20} />}
            type={showConfirm ? "text" : "password"}
            name="confirmPassword"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[hsl(var(--color-content-muted))] hover:text-[hsl(var(--color-content))] focus:outline-none z-10"
          >
            {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {fieldErrors.confirmPassword && <p className="text-sm text-red-400 -mt-1">{fieldErrors.confirmPassword}</p>}

        <button
          disabled={loading}
          className="w-full h-14 rounded-xl bg-gradient-to-r from-[hsl(var(--color-primary))] to-yellow-500 text-[hsl(var(--color-primary-foreground))] font-bold hover:brightness-110 shadow-lg shadow-amber-500/25 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}