import { IconStarFilled } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { FeedbackResults } from "@/backend/loyalty/feedback.api.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Progress } from "@/components/ui/progress.tsx";

/** Mean rating per question over the period — the line an owner reads to staff. */
export function QuestionAveragesCard({
  averages,
}: Readonly<{ averages: FeedbackResults["questionAverages"] }>) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("By question")}</CardTitle>
        <CardDescription>{t("Average rating out of 5, over the period.")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {averages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No ratings yet.")}</p>
        ) : (
          averages.map((row) => (
            <div key={row.elementId} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-foreground">{row.title}</span>
                <span className="flex shrink-0 items-center gap-1 tabular-nums text-muted-foreground">
                  {row.average === null ? (
                    "—"
                  ) : (
                    <>
                      <IconStarFilled size={12} className="text-amber-700 dark:text-amber-500" />
                      <span className="font-medium text-foreground">{row.average.toFixed(1)}</span>
                    </>
                  )}
                  <span>· {t("{count} answers", { count: row.count })}</span>
                </span>
              </div>
              <Progress value={row.average === null ? 0 : (row.average / 5) * 100} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
