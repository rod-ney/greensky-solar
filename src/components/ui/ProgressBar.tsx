interface ProgressBarProps {
  value: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export default function ProgressBar({
  value,
  size = "sm",
  showLabel = true,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex-1 overflow-hidden rounded-full bg-slate-100 ${
          size === "sm" ? "h-1.5" : "h-2.5"
        }`}
      >
        <div
          className="h-full rounded-full bg-brand transition-all duration-300"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-slate-600 min-w-[2.5rem] text-right">
          {clampedValue}%
        </span>
      )}
    </div>
  );
}
