import { cn } from "@/lib/utils";

export interface LengthTrackerProps {
  length: number;
  maxValue: number;
  atStart?: boolean;
}
export function LengthTracker({ maxValue, length, atStart = false }: LengthTrackerProps) {
  return (
    <div className={cn("flex", atStart ? "justify-start" : "justify-end")}>
      <p className="pr-2 text-[0.8rem] text-muted-foreground">
        <span className={length > maxValue ? "text-red-500" : ""}>{length}</span>
        <span>{` / ${maxValue}`}</span>
      </p>
    </div>
  );
}
