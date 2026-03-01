"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

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
    <div className="flex min-h-screen">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
      />
      <div
        className={`flex flex-1 flex-col transition-[padding] duration-200 ${
          sidebarCollapsed ? "pl-0" : "pl-64"
        }`}
      >
        <Navbar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((p) => !p)}
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
