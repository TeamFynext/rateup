import { cn } from "@/lib/utils.ts";

import classes from "../../TakeSurvey.module.css";

export default function FormPaperLayout(props: any) {
  return (
    <div
      {...props}
      className={cn(classes.inputBox, "h-fit shadow-sm", props.className)}
      style={{
        borderColor: "var(--tertiary-color)",
      }}
    >
      {props.children}
    </div>
  );
}
