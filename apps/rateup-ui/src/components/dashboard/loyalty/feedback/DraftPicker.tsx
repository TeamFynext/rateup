import { IconMessage, IconStar } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { FeedbackDraft, FeedbackDraftKey } from "@/backend/loyalty/feedback.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";

/** One card per ready-made survey; the questions are listed so the pick is made on content. */
export function DraftPicker({
  drafts,
  suggestedKey,
  value,
  onChange,
}: Readonly<{
  drafts: FeedbackDraft[];
  suggestedKey: FeedbackDraftKey | undefined;
  value: FeedbackDraftKey | undefined;
  onChange: (key: FeedbackDraftKey) => void;
}>) {
  const { t } = useTranslation();

  return (
    <div role="radiogroup" aria-label={t("Feedback survey")} className="grid gap-3">
      {drafts.map((draft) => {
        const selected = draft.key === value;
        return (
          <button
            key={draft.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(draft.key)}
            className={cn(
              "flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
              "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "border-primary bg-primary/5" : "border-border bg-card",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{draft.label}</span>
              {draft.key === suggestedKey && (
                <Badge variant="secondary">{t("Suggested for you")}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{draft.description}</p>
            <ul className="flex flex-wrap gap-1.5">
              {draft.questions.map((question) => (
                <li
                  key={question.title}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-foreground"
                >
                  {question.kind === "rating" ? (
                    <IconStar size={12} className="text-amber-700 dark:text-amber-500" />
                  ) : (
                    <IconMessage size={12} className="text-muted-foreground" />
                  )}
                  {question.title}
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}
