import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/components/ui/card.tsx";

import type { Suggestion } from "./suggestions.ts";

/**
 * "What to do next": each nudge names the number that triggered it and links to the fix.
 *
 * The subtitle deliberately does not mention the period picker. Every rule in
 * `buildSuggestions` reads programme config, onboarding progress, the template queue, or a
 * *current* count — total members, the tier breakdown, balances under the cheapest reward —
 * and none of those carry a date filter. Saying "this period's numbers" invited the reader
 * to change the period and watch for a card that cannot move.
 */
export function SuggestionsCard({ suggestions }: Readonly<{ suggestions: Suggestion[] }>) {
  const { t } = useTranslation();

  return (
    <Card className="border-border">
      <CardContent className="flex flex-col gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("What to do next")}</p>
          <p className="text-xs text-muted-foreground">
            {suggestions.length > 0
              ? t("Based on how your program is set up and where members stand today")
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
      </CardContent>
    </Card>
  );
}
