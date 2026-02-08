import { Skeleton } from "@/components/ui/skeleton";

export function WorkoutListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="border rounded-2xl shadow-sm bg-card overflow-hidden">
          {/* Header skeleton */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-2 flex-1">
              {/* Date skeleton */}
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-6 w-32" />
              </div>
              {/* Badges skeleton */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>
            {/* Action buttons skeleton */}
            <div className="flex items-center gap-1 ml-4 shrink-0">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>

          {/* Content skeleton */}
          <div className="px-6 pb-6 pt-0 space-y-3">
            <Skeleton className="h-4 w-48" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
