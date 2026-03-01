import { Skeleton } from "@/components/ui/Skeleton";
import LandingHeader from "@/components/layout/LandingHeader";

type Variant = "login" | "register" | "forgot";

function FormFieldsSkeleton({ variant }: { variant: Variant }) {
  if (variant === "forgot") {
    return (
      <div className="space-y-5">
        <div>
          <Skeleton className="mb-1.5 h-4 w-28" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }
  if (variant === "register") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Skeleton className="mb-1.5 h-4 w-20" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
          <div>
            <Skeleton className="mb-1.5 h-4 w-20" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
        <div>
          <Skeleton className="mb-1.5 h-4 w-28" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div>
          <Skeleton className="mb-1.5 h-4 w-28" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div>
          <Skeleton className="mb-1.5 h-4 w-20" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div>
          <Skeleton className="mb-1.5 h-4 w-28" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }
  // login: 2 inputs + button
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="mb-1.5 h-4 w-28" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
}

export default function AuthFormSkeleton({ variant = "login" }: { variant?: Variant }) {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingHeader />
      <div className="flex-1 flex">
        {/* Left: Image placeholder (matches login/register/forgot split layout) */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-shrink-0 min-h-0 bg-slate-200 animate-pulse" />

        {/* Right: Form area */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-white min-h-0">
          <div className="w-full max-w-md mx-auto">
            {/* Mobile logo placeholder */}
            <div className="lg:hidden mb-8">
              <Skeleton className="h-10 w-36 rounded" />
            </div>

            <div className="space-y-8">
              <div>
                <Skeleton className="h-9 w-48" />
                <Skeleton className="mt-1 h-4 w-72 max-w-full" />
              </div>
              <FormFieldsSkeleton variant={variant} />
            </div>

            <div className="mt-6 flex justify-center">
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
