import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils.ts";

import classes from "../../TakeSurvey.module.css";

export default function FormPaperLayout({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div {...props} className={cn(classes.inputBox, "h-fit border-primary shadow-sm", className)}>
      {children}
    </div>
  );
}
