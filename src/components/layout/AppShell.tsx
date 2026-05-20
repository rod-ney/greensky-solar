"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const syncSidebarMode = () => {
      setSidebarCollapsed((prev) => (media.matches ? true : prev));
    };

    syncSidebarMode();
    media.addEventListener("change", syncSidebarMode);
    return () => media.removeEventListener("change", syncSidebarMode);
  }, []);

  if (isClientRoute || isTechnicianRoute || isPublicAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-white">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
      />
      <div
        className={`relative z-10 flex flex-1 flex-col transition-[padding] duration-200 ${
          sidebarCollapsed ? "pl-20" : "pl-64"
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
