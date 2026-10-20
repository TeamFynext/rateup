import { Fragment } from "react";

import type {
  SentencePart,
  SentenceRole,
  WizardStep,
} from "@/components/dashboard/automation/rule-sentence.ts";
import { cn } from "@/lib/utils.ts";

const ROLE_CLASS: Record<SentenceRole, string> = {
  word: "text-muted-foreground",
  trigger: "text-primary font-medium",
  condition: "text-foreground font-medium",
  action: "text-green-700 dark:text-green-400 font-medium",
  limit: "text-amber-700 dark:text-amber-500 font-medium",
  missing: "text-muted-foreground/70 italic",
};

/** Punctuation sits against the word before it. */
const attaches = (text: string) => /^[,.]/.test(text);

/**
 * The rule sentence, coloured by what each part is. With `onEdit`, every part that belongs to a
 * step becomes a link to it.
 */
export function RuleSentenceText({
  parts,
  onEdit,
  className,
}: Readonly<{
  parts: readonly SentencePart[];
  onEdit?: (step: WizardStep) => void;
  className?: string;
}>) {
  return (
    <p className={cn("text-pretty", className)}>
      {parts.map((part, index) => {
        const space = index > 0 && !attaches(part.text) ? " " : "";
        const editable = onEdit && part.step && part.role !== "word";
        return (
          <Fragment key={`${index}-${part.text}`}>
            {space}
            {editable ? (
              <button
                type="button"
                onClick={() => part.step && onEdit(part.step)}
                className={cn(
                  ROLE_CLASS[part.role],
                  "decoration-current/30 cursor-pointer rounded-sm underline decoration-dotted underline-offset-4 hover:decoration-current",
                  "focus-visible:ring-ring outline-none focus-visible:ring-2",
                )}
              >
                {part.text}
              </button>
            ) : (
              <span className={ROLE_CLASS[part.role]}>{part.text}</span>
            )}
          </Fragment>
        );
      })}
    </p>
  );
}
