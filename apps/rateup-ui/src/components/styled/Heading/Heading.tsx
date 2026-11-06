import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

interface HeadingPropsInterface {
  title?: string;
  subtitle?: string;
  label?: string;
  titleprops?: ComponentPropsWithoutRef<"h2">;
}

export default function Heading({ label, subtitle, title, titleprops }: HeadingPropsInterface) {
  return (
    <div className="flex flex-col gap-[5px] p-0">
      {title && (
        <h2
          {...titleprops}
          title={title}
          className={cn(
            "w-[300px] max-w-[300px] truncate text-[32px] font-semibold",
            titleprops?.className,
          )}
        >
          {title}
        </h2>
      )}
      {subtitle && (
        <h3
          {...titleprops}
          title={subtitle}
          className={cn("text-xl font-semibold", titleprops?.className)}
        >
          {subtitle}
        </h3>
      )}
      {label && (
        <p title={label} className="text-muted-foreground">
          {label}
        </p>
      )}
    </div>
  );
}
