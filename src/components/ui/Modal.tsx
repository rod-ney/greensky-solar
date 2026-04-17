"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  /** Higher values appear on top when modals are stacked. Default 50. Use 60+ for confirmation overlays. */
  zIndex?: number;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  zIndex = 50,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const sizeClasses = {
    xs: "max-w-sm",
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-5xl",
    "2xl": "max-w-6xl",
    full: "max-w-none",
  };
  const isFull = size === "full";

  const panelHeightClass = isFull
    ? "h-[min(calc(100vh-2rem),calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)]"
    : "my-auto max-h-[min(82vh,calc(100dvh-2rem))]";

  /**
   * Non-full: no flex-1 — that was stretching the body to fill max-height and left huge gaps on small
   * content (confirm dialogs). Body scrolls when children exceed viewport minus header (~5.25rem).
   */
  const bodyClassName = isFull
    ? "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4"
    : "max-h-[calc(min(82vh,calc(100dvh-2rem))-5.25rem)] overflow-y-auto overscroll-contain px-6 py-4 [scrollbar-gutter:stable]";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 flex min-h-full items-start justify-center overflow-y-auto overflow-x-hidden bg-slate-950/55 px-4 py-6 sm:px-5 sm:py-8"
          style={{ zIndex }}
          onClick={(e) => {
            if (e.target === overlayRef.current) onClose();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          <motion.div
            className={`relative flex w-full shrink-0 flex-col overflow-hidden bg-gradient-to-b from-white to-slate-50 shadow-xl ${sizeClasses[size]} ${panelHeightClass} ${isFull ? "rounded-2xl" : "rounded-xl"}`}
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className={bodyClassName}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
