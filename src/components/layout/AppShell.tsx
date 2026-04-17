"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import QuickAccessMenu from "@/components/ui/QuickAccessMenu";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isClientRoute = pathname === "/client" || pathname.startsWith("/client/");
  const isTechnicianRoute =
    pathname === "/technician" || pathname.startsWith("/technician/");
  const isPublicAuthRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/about" ||
    pathname === "/prices" ||
    pathname.startsWith("/preview");

  if (isClientRoute || isTechnicianRoute || isPublicAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-emerald-50/30 to-blue-50/40">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-24 h-80 w-80 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-blue-200/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-200/20 blur-3xl" />
      </div>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
      />
      <div
        className={`relative z-10 flex flex-1 flex-col transition-[padding] duration-200 ${
          sidebarCollapsed ? "pl-0" : "pl-64"
        }`}
      >
        <Navbar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((p) => !p)}
        />
        <main className="flex-1 p-6">{children}</main>
        <QuickAccessMenu
          sidebarCollapsed={sidebarCollapsed}
          onSetSidebarCollapsed={setSidebarCollapsed}
        />
      </div>
    </div>
  );
}
