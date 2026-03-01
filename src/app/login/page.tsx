"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import LandingHeader from "@/components/layout/LandingHeader";

function getHomePathByRole(role: string | undefined): string {
  if (role === "client") return "/client";
  if (role === "technician") return "/technician";
  return "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        id?: string;
        name?: string;
        email?: string;
        role?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Login failed.");
        return;
      }

      // Cookies are set by the server in the response (HttpOnly)
      router.push(getHomePathByRole(payload.role));
    } catch {
      setError("Unable to log in right now. Please try again.");
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
            Power your future with clean energy. Sign in to manage your solar projects.
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

          <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-base text-slate-500">
            Sign in to continue managing your solar projects.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-base text-red-700">
              {error}
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-base font-medium text-slate-700">
                  Password
                </label>
                <Link href="/forgot-password" className="text-sm text-brand hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-brand/20"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-brand px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-dark disabled:opacity-70"
            >
              {isSubmitting ? "Logging in..." : "Log In"}
            </button>
          </form>

          <p className="mt-6 text-center text-base text-slate-600">
            New here?{" "}
            <Link href="/register" className="font-semibold text-brand hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
