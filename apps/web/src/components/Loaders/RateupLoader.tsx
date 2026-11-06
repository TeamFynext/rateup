import { Spinner } from "@rateup/ui/components/spinner";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils.ts";

export default function RateupLoader({
  className,
  style,
  ...props
}: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn("flex h-full items-center justify-center", className)}
      style={style}
      {...props}
    >
      <Spinner />
    </div>
  );
}
