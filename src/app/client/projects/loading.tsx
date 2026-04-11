export default function ClientProjectsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-slate-100 rounded-full animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse">
            <div className="flex items-start justify-between mb-3">
              <div className="h-4 w-2/3 bg-slate-100 rounded" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="h-3 w-1/2 bg-slate-100 rounded mb-4" />
            <div className="h-2 w-full bg-slate-100 rounded mb-3" />
            <div className="h-3 w-3/4 bg-slate-100 rounded mb-3" />
            <div className="h-5 w-12 bg-slate-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
