import type { LucideIcon } from "lucide-react";

type WorkspaceEmptyProps = {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  /** Larger default; compact for nested panels */
  variant?: "default" | "compact";
  children?: React.ReactNode;
};

/**
 * Shared empty workspace (projects list, tasks, technician panels).
 */
export default function WorkspaceEmpty({
  icon: Icon,
  title,
  description,
  variant = "default",
  children,
}: WorkspaceEmptyProps) {
  const isCompact = variant === "compact";

  return (
    <div
      className={
        isCompact
          ? "rounded-xl bg-gradient-to-b from-brand-50/35 to-white px-5 py-10 text-center"
          : "rounded-2xl bg-gradient-to-b from-brand-50/45 via-white to-slate-50/30 px-6 py-16 text-center"
      }
    >
      <div
        className={`mx-auto flex items-center justify-center rounded-2xl bg-brand/10 ring-[8px] ring-brand/5 ${isCompact ? "h-16 w-16" : "h-20 w-20"}`}
      >
        <Icon className={isCompact ? "h-9 w-9 text-brand" : "h-11 w-11 text-brand"} strokeWidth={1.6} />
      </div>
      <h3
        className={`font-semibold text-slate-900 ${isCompact ? "mt-3 text-sm" : "mt-5 text-base"}`}
      >
        {title}
      </h3>
      <p
        className={`mt-2 text-slate-500 mx-auto leading-relaxed ${isCompact ? "max-w-[280px] text-xs" : "max-w-md text-sm"}`}
      >
        {description}
      </p>
      {children ? <div className={`flex flex-wrap items-center justify-center gap-2 ${isCompact ? "mt-4" : "mt-6"}`}>{children}</div> : null}
    </div>
  );
}
