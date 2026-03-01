import { Skeleton, SkeletonNavCards } from "@/components/ui/Skeleton";

export default function ClientHomeSkeleton() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-emerald-700 p-6 sm:p-8">
        <div className="relative z-10">
          <Skeleton className="h-4 w-24 bg-white/30" />
          <Skeleton className="mt-1 h-8 w-48 bg-white/40" />
          <Skeleton className="mt-2 h-4 w-80 max-w-md bg-white/30" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <Skeleton className="mx-auto h-9 w-9 rounded-lg" />
            <Skeleton className="mt-2 mx-auto h-6 w-8" />
            <Skeleton className="mt-1 mx-auto h-3 w-24" />
          </div>
        ))}
      </div>

      <div>
        <Skeleton className="h-4 w-24 mb-4" />
        <SkeletonNavCards count={7} />
      </div>
    </div>
  );
}
