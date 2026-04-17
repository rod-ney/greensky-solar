"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import Modal from "@/components/ui/Modal";
import { navItems } from "@/lib/nav-items";

const cardTones = [
  {
    iconWrap: "text-emerald-700",
    border: "border-emerald-200/80",
    hover: "hover:border-emerald-300 hover:shadow-emerald-100/70",
  },
  {
    iconWrap: "text-sky-700",
    border: "border-sky-200/80",
    hover: "hover:border-sky-300 hover:shadow-sky-100/70",
  },
  {
    iconWrap: "text-violet-700",
    border: "border-violet-200/80",
    hover: "hover:border-violet-300 hover:shadow-violet-100/70",
  },
  {
    iconWrap: "text-amber-700",
    border: "border-amber-200/80",
    hover: "hover:border-amber-300 hover:shadow-amber-100/70",
  },
];

type QuickAccessMenuProps = {
  sidebarCollapsed?: boolean;
  onSetSidebarCollapsed?: (collapsed: boolean) => void;
};

export default function QuickAccessMenu({
  sidebarCollapsed = false,
  onSetSidebarCollapsed,
}: QuickAccessMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const shouldRestoreSidebarRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "m" && e.key !== "M") return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;
      setIsOpen((prev) => !prev);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!onSetSidebarCollapsed) return;

    if (isOpen) {
      shouldRestoreSidebarRef.current = !sidebarCollapsed;
      if (!sidebarCollapsed) onSetSidebarCollapsed(true);
      return;
    }

    if (shouldRestoreSidebarRef.current) {
      onSetSidebarCollapsed(false);
      shouldRestoreSidebarRef.current = false;
    }
  }, [isOpen, onSetSidebarCollapsed, sidebarCollapsed]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Quick Access"
      size="full"
    >
      <div className="mb-6 rounded-2xl border border-brand/15 bg-gradient-to-r from-brand-50 via-white to-blue-50 px-4 py-3 shadow-sm">
        <p className="text-sm font-medium text-slate-700">
          Jump to any section with quick links
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Press{" "}
          <kbd className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 shadow-sm">
            M
          </kbd>{" "}
          to open or close this menu.
        </p>
      </div>
      <motion.div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.02, delayChildren: 0.02 } },
        }}
      >
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const tone = cardTones[index % cardTones.length];
          return (
            <motion.div
              key={item.href}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Link
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`group relative flex min-h-[150px] flex-col items-center justify-center gap-3.5 rounded-2xl border p-5 text-center shadow-sm transition-all duration-200 will-change-transform ${
                  isActive
                    ? "border-brand/40 bg-gradient-to-br from-brand-50 to-cyan-50 text-brand shadow-md shadow-brand/10 ring-1 ring-brand/25"
                    : `${tone.border} bg-gradient-to-br from-white to-slate-50 text-slate-700 hover:-translate-y-0.5 hover:from-white hover:to-slate-100 hover:text-slate-900 hover:shadow-md ${tone.hover}`
                }`}
              >
                <motion.div
                  className={`flex h-14 w-14 items-center justify-center rounded-xl transition-colors ${
                    isActive ? "text-brand" : tone.iconWrap
                  }`}
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <Icon className="h-8 w-8" />
                </motion.div>
                <span className="text-sm font-semibold leading-tight">
                  {item.label}
                </span>
                <span
                  className={`text-xs leading-snug ${
                    isActive ? "text-brand/80" : "text-slate-500"
                  }`}
                >
                  {item.description}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </Modal>
  );
}
