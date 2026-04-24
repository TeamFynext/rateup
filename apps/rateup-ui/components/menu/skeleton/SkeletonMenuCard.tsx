import React from "react";

import { Skeleton } from "@/components/ui/skeleton";

type SkeletonMenuCardProps = {
  readonly isMobile?: boolean;
};
export const SkeletonMenuCard = ({ isMobile }: SkeletonMenuCardProps) => {
  const boxes = [
    { h: 5, w: 42 },
    { h: 1.5, w: 42 },
    { h: 1.5, w: 53 },
    { h: 1.5, w: 70 },
  ];
  return (
    <div
      className={`mb-0.5 flex items-center rounded-md bg-muted/60 p-3 ${isMobile ? "w-full" : "w-[28.75rem]"}`}
    >
      <Skeleton className="h-33 w-33 rounded-sm bg-muted" />

      <div className="ml-3 flex flex-1 flex-col gap-1.5">
        {boxes?.map((box) => (
          <Skeleton
            key={`${box.h}-${box.w}`}
            className="rounded-sm bg-muted"
            style={{
              height: `${box.h * 0.25}rem`,
              width: `${box.w * 0.25}rem`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
