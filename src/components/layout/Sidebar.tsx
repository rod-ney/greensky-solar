"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  ShieldCheck,
  Calendar,
  ClipboardList,
  Users,
  UserCog,
  FileBarChart,
  Package,
  Receipt,
  Bell,
  PanelLeftClose,
} from "lucide-react";
import {
  getDisplayName,
  getInitials,
  useSessionUser,
} from "@/lib/client-session";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Bookings", href: "/bookings", icon: ClipboardList },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "After Sales", href: "/after-sales", icon: ShieldCheck },
  { label: "Technicians", href: "/technicians", icon: Users },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Invoice", href: "/invoice", icon: Receipt },
  { label: "Reports", href: "/reports", icon: FileBarChart },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "User Management", href: "/users", icon: UserCog },
];

type SidebarProps = {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const sessionUser = useSessionUser();
  const displayName = getDisplayName(sessionUser.name);

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-200 ${
        collapsed ? "w-0 -translate-x-full overflow-hidden" : "w-64"
      }`}
    >
      {/* Logo + Hide button */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo_greensky.png"
            alt="GreenSky Solar Energy"
            width={140}
            height={42}
            className="h-9 w-auto object-contain"
          />
          <span className="text-base font-semibold leading-tight">
            <span style={{ color: "#118c3a" }}>Greensky</span>
            <span className="text-blue-600"> Solar</span>
          </span>
        </Link>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            title="Hide sidebar"
            aria-label="Hide sidebar"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                isActive
                  ? "bg-brand-50 text-brand"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-brand" : "text-slate-400"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
            {getInitials(displayName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{displayName}</p>
            <p className="truncate text-xs text-slate-500">{sessionUser.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
