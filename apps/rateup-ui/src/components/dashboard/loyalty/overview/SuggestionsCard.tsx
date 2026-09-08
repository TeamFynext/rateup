import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/components/ui/card.tsx";

import type { Suggestion } from "./suggestions.ts";

/** "What to do next": each nudge names the number that triggered it and links to the fix. */
export function SuggestionsCard({ suggestions }: Readonly<{ suggestions: Suggestion[] }>) {
  const { t } = useTranslation();

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("What to do next")}</p>
          <p className="text-xs text-muted-foreground">
            {suggestions.length > 0
              ? t("What this period's numbers suggest")
              : t("Nothing needs your attention right now.")}
          </p>
        </div>
        {suggestions.length > 0 && (
          <ol className="flex flex-col divide-y divide-border">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-foreground">{suggestion.title}</p>
                <p className="text-xs text-muted-foreground">{suggestion.body}</p>
                <Link
                  {...suggestion.target}
                  className="inline-flex items-center gap-1 self-start text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  {suggestion.cta} <IconArrowRight size={12} />
                </Link>
              </li>
            ))}
          </ol>
        )}
        <p className="text-xs text-muted-foreground">
          {t("Refreshed from the selected period's activity.")}
        </p>
      </CardContent>
    </Card>
  );
}
