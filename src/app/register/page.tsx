"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import LandingHeader from "@/components/layout/LandingHeader";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const name = `${firstName} ${lastName}`.trim();
    const digitsOnly = contactNumber.replace(/\D/g, "");
    if (!name || !email.trim() || !password || !confirmPassword) {
      setError("Please complete all required fields.");
      return;
    }
    if (digitsOnly.length !== 10 || !/^\d{10}$/.test(digitsOnly)) {
      setError("Contact number must be exactly 10 digits.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email.trim(),
          password,
          contactNumber: digitsOnly,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Registration failed.");
        return;
      }
      router.push("/login");
    } catch {
      setError("Unable to register right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <LandingHeader />
      <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Left: Background image with overlay - fixed, never scrolls */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-shrink-0 overflow-hidden overscroll-none flex-col items-center justify-center p-12 gap-8"
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
            Join hundreds of homeowners powering their future with clean energy. Create your account to get started.
          </p>
        </div>
      </div>

        {/* Right: Form - only scrollable section */}
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto px-6 py-12 sm:px-12 lg:px-16 bg-white">
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

          <h1 className="text-3xl font-bold text-slate-900">Create your account</h1>
          <p className="mt-1 text-base text-slate-500">
            Register to start using GreenSky Solar.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-base text-red-700">
              {error}
            </div>
          )}

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-1.5 block text-base font-medium text-slate-700"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="Juan"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="mb-1.5 block text-base font-medium text-slate-700"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Dela Cruz"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-base font-medium text-slate-700"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div>
              <label
                htmlFor="contactNumber"
                className="mb-1.5 block text-base font-medium text-slate-700"
              >
                Contact Number
              </label>
              <div className="flex items-center overflow-hidden rounded-lg border border-slate-300 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                <span className="border-r border-slate-300 bg-slate-50 px-3 py-3 text-base font-medium text-slate-600">
                  +63
                </span>
                <input
                  id="contactNumber"
                  type="tel"
                  inputMode="numeric"
                  placeholder="9123456789"
                  value={contactNumber}
                  onChange={(event) => {
                    const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 10);
                    setContactNumber(digitsOnly);
                  }}
                  className="w-full px-4 py-3 text-base outline-none"
                />
              </div>
              <p className="mt-1 text-sm text-slate-500">Enter 10 digits only.</p>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-base font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
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

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-base font-medium text-slate-700"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-brand/20"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-brand px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-dark disabled:opacity-70"
            >
              {isSubmitting ? "Registering..." : "Sign Up"}
            </button>
          </form>

          <p className="mt-6 text-center text-base text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
