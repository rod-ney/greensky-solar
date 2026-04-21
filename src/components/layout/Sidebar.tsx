"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { PanelLeftClose, Sun } from "lucide-react";
import {
  getDisplayName,
  getInitials,
  useSessionUser,
} from "@/lib/client-session";
import { navItems, type NavItem } from "@/lib/nav-items";

type SidebarProps = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const sessionUser = useSessionUser();
  const displayName = getDisplayName(sessionUser.name);
  const categoryOrder: NavItem["category"][] = ["Overview", "Operations", "Management", "System"];

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col overflow-hidden border-r border-white/15 bg-gradient-to-br from-brand to-emerald-700 text-white transition-all duration-200 ${collapsed ? "w-0 -translate-x-full overflow-hidden" : "w-64"
        }`}
    >
      {/* Match client welcome card: soft orbs + sun (positioned for narrow column) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute -right-4 top-24 h-20 w-20 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 left-8 h-24 w-24 rounded-full bg-white/5" />
        <Sun className="absolute bottom-20 right-2 h-14 w-14 text-white/10" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* Logo + Hide button */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/15 px-4">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2">
            <Image
              src="/logo_greensky.png"
              alt="GreenSky Solar Energy"
              width={140}
              height={42}
              className="h-9 w-auto shrink-0 object-contain"
            />
            <span className="min-w-0 truncate text-base font-semibold leading-tight">
              <span style={{ color: "white" }}>Greensky</span>
              <span className="font-bold text-yellow-600">
                {" "}
                Solar
              </span>
            </span>
          </Link>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
              title="Hide sidebar"
              aria-label="Hide sidebar"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {categoryOrder.map((category) => {
            const items = navItems.filter((item) => item.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category} className="space-y-1">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-white/60">
                  {category}
                </p>
                {items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive
                          ? "bg-white/15 text-white shadow-sm backdrop-blur-sm ring-1 ring-white/20"
                          : "text-white/90 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                      <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-white/70"}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/15 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white ring-1 ring-white/30">
              {getInitials(displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
              <p className="truncate text-xs text-white/75">{sessionUser.email}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
