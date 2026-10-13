"use client";

import RegisterForm from "@/app/components/registerForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] via-[#141a21] to-[#0b0e12] flex items-center justify-center p-8">
      <RegisterForm />
    </div>
  );
}