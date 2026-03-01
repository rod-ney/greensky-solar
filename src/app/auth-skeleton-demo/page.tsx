"use client";

import { useState } from "react";
import AuthFormSkeleton from "@/components/ui/skeletons/AuthFormSkeleton";
import Link from "next/link";

type Variant = "login" | "register" | "forgot";

export default function AuthSkeletonDemoPage() {
  const [variant, setVariant] = useState<Variant>("login");

  return (
    <div className="relative min-h-screen">
      {/* Floating controls */}
      <div className="fixed left-1/2 top-4 z-[100] -translate-x-1/2 flex gap-2 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur-sm">
        {(["login", "register", "forgot"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVariant(v)}
            className={`rounded-md px-4 py-2 text-sm font-medium capitalize transition ${
              variant === v ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {v.replace("-", " ")}
          </button>
        ))}
        <Link
          href="/"
          className="ml-2 flex items-center rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          ← Exit
        </Link>
      </div>

      <AuthFormSkeleton variant={variant} />
    </div>
  );
}
