import ContentSkeleton from "@/components/ui/skeletons/ContentSkeleton";
import LandingHeader from "@/components/layout/LandingHeader";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-100">
      <LandingHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <ContentSkeleton />
      </main>
    </div>
  );
}
