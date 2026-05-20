import { Skeleton } from "../ui/skeleton.tsx";

function TeamSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            {/* Back button */}
            <Skeleton className="h-8 w-32 rounded-md" />

            <div className="h-6 w-px bg-gray-300" />

            {/* Avatar */}
            <Skeleton className="w-12 h-12 rounded-xl" />

            {/* Text */}
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-8 border-b border-gray-200 pb-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Members list skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default TeamSkeleton;
