"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, UserCircle2, LogOut, PanelLeft } from "lucide-react";
import {
  getDisplayName,
  getInitials,
  useSessionUser,
} from "@/lib/client-session";
import NotificationBell from "@/components/profile/NotificationBell";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/profile": "Profile",
  "/notifications": "Notifications",
  "/projects": "Projects",
  "/after-sales": "After Sales",
  "/bookings": "Bookings",
  "/calendar": "Calendar",
  "/technicians": "Technicians",
  "/inventory": "Inventory",
  "/users": "User Management",
  "/reports": "Reports",
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/projects/")) return "Task Manager";
  for (const [key, value] of Object.entries(pageTitles)) {
    if (pathname === key || pathname.startsWith(key + "/")) return value;
  }
  return "Dashboard";
}

type NavbarProps = {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

export default function Navbar({ sidebarCollapsed, onToggleSidebar }: NavbarProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const sessionUser = useSessionUser();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const displayName = getDisplayName(sessionUser.name);
  const profileHref = sessionUser.role === "client" ? "/client/profile" : sessionUser.role === "technician" ? "/technician/profile" : "/profile";

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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      {/* Left: Show sidebar button (when collapsed) + Page Title */}
      <div className="flex items-center gap-3">
        {sidebarCollapsed && onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            title="Show sidebar"
            aria-label="Show sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
        )}
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="h-9 w-64 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Notifications */}
        <NotificationBell notificationsHref="/notifications" />

        {/* Profile Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-bold text-white hover:bg-brand-dark"
            title="Profile menu"
          >
            {getInitials(displayName)}
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{displayName}</p>
                <p className="text-[11px] text-slate-500 truncate">{sessionUser.email}</p>
              </div>
              <Link
                href={profileHref}
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
    </header>
  );
}
