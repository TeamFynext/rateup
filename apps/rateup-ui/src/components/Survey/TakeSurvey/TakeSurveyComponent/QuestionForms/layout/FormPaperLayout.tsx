import { cn } from "@/lib/utils.ts";

import classes from "../../TakeSurvey.module.css";

export default function FormPaperLayout(props: unknown) {
  return (
    <div
      {...props}
      className={cn(classes.inputBox, "h-fit border-primary shadow-sm", props.className)}
    >
      {props.children}
    </div>
  );
}
