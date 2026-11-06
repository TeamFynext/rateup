import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils.ts";

import { parseTimeInput } from "./schema.ts";

/**
 * A time you type rather than hunt for in a 48-item dropdown. Accepts "9", "9am", "930",
 * "0930", "9:30", "6pm", "18:00"; commits on blur and on Enter, and reverts to the last
 * good value when the text cannot be read as a time — so the field is never left holding
 * something the schedule does not actually contain.
 */
interface Props {
  value: string;
  onChange: (value: string) => void;
  label: string;
  invalid?: boolean;
}

export function TimeField({ value, onChange, label, invalid }: Readonly<Props>) {
  const [draft, setDraft] = useState(value);

  // The value also changes from outside the field — "apply to all days" rewrites every
  // row at once — so the draft follows it while the field is not being edited.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const parsed = parseTimeInput(draft);
    if (parsed) {
      onChange(parsed);
      setDraft(parsed);
    } else {
      setDraft(value);
    }
  };

  return (
    <Input
      value={draft}
      aria-label={label}
      aria-invalid={invalid}
      inputMode="numeric"
      className={cn("h-8 w-20 text-center tabular-nums", invalid && "border-destructive")}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
        if (event.key === "Escape") setDraft(value);
      }}
    />
  );
}
