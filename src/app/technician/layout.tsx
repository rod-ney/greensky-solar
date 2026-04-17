"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, UserCircle2, LogOut } from "lucide-react";
import {
  getDisplayName,
  getInitials,
  useSessionUser,
} from "@/lib/client-session";
import NotificationBell from "@/components/profile/NotificationBell";

export default function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/technician";
  const sessionUser = useSessionUser();
  const displayName = useMemo(() => getDisplayName(sessionUser.name), [sessionUser.name]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/login";
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-emerald-50/40 to-blue-50/50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-emerald-200/25 blur-3xl" />
        <div className="absolute top-20 right-0 h-80 w-80 rounded-full bg-blue-200/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
      </div>
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
          {/* Left */}
          <div className="flex items-center gap-3">
            {!isHome && (
              <Link
                href="/technician"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors mr-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}
            <Link href="/technician" className="flex items-center gap-2.5">
              <Image
                src="/logo_greensky.png"
                alt="GreenSky Solar Energy"
                width={120}
                height={36}
                className="h-9 w-auto object-contain"
              />
              <div className="flex flex-col">
                <span className="text-base font-semibold leading-tight">
                  <span style={{ color: "#118c3a" }}>Greensky</span>
                  <span className="text-blue-600"> Solar</span>
                </span>
                <p className="text-[10px] font-medium text-slate-400 leading-tight">
                  Technician Portal
                </p>
              </div>
            </Link>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <NotificationBell notificationsHref="/technician/notifications" />
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 rounded-full border border-slate-200 py-1 pl-1 pr-3 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Profile menu"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                  {getInitials(displayName)}
                </div>
                <span className="text-sm font-medium text-slate-700 hidden sm:block">
                  {displayName}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">{displayName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{sessionUser.email}</p>
                  </div>
                  <Link
                    href="/technician/profile"
                    onClick={() => setMenuOpen(false)}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <UserCircle2 className="h-4 w-4" />
                    Profile
                  </Link>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
