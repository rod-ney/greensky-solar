"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import LandingHeader from "@/components/layout/LandingHeader";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (res.ok) {
        setMessage(data.message ?? "If an account exists with that email, we've sent a reset link.");
      } else {
        setError(data.error ?? "Something went wrong.");
      }
    } catch {
      setError("Unable to process your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <LandingHeader />
      <div className="flex-1 flex">
        {/* Left: Background image with overlay */}
        <div
          className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-12 gap-8 min-h-0"
          style={{
            backgroundImage: "url('/split.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute inset-0 bg-brand/50" />
          <div className="relative z-10 flex flex-col items-center justify-center gap-6 text-center">
            <Link href="/" className="flex flex-col items-center gap-4">
              <Image
                src="/logo_greensky.png"
                alt="GreenSky Solar Energy"
                width={280}
                height={168}
                className="h-36 w-auto object-contain drop-shadow-lg"
              />
            </Link>
            <p className="text-center text-white text-lg max-w-sm drop-shadow-sm">
              Power your future with clean energy. Reset your password to continue managing your solar projects.
            </p>
          </div>
        </div>

        {/* Right: Form */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-white">
          <div className="w-full max-w-md mx-auto">
            {/* Mobile logo */}
            <Link href="/" className="lg:hidden flex items-center mb-8">
              <Image
                src="/logo_greensky.png"
                alt="GreenSky Solar Energy"
                width={140}
                height={42}
                className="h-10 w-auto object-contain"
              />
            </Link>

            <h1 className="text-3xl font-bold text-slate-900">Forgot password</h1>
            <p className="mt-1 text-base text-slate-500">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-base text-red-700">
                {error}
              </div>
            )}
            {message && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-base text-green-700">
                {message}
              </div>
            )}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-base font-medium text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-brand px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-dark disabled:opacity-70"
              >
                {isSubmitting ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p className="mt-6 text-center text-base text-slate-600">
              Remember your password?{" "}
              <Link href="/login" className="font-semibold text-brand hover:underline">
                Back to login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
