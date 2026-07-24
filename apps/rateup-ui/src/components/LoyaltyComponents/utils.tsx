import { Skeleton } from "@/components/ui/skeleton.tsx";

export const SelectSkeleton = () => {
  return (
    <div className="h-11.5 w-60 rounded-md border border-border bg-card">
      <div className="flex h-full w-full flex-row items-center justify-between">
        <Skeleton className="ml-2 h-5 w-25" />
        <Skeleton className="mr-2 h-5 w-5" />
      </div>
    </div>
  );
};
