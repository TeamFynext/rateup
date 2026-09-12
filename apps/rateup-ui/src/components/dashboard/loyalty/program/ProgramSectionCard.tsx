import { IconAlertTriangle, IconChevronRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { cn } from "@/lib/utils.ts";

import { LOYALTY_PATHS } from "../paths.ts";
import type { SectionSummary, SummaryTag } from "./programSummary.ts";

/** One of the four sections on the Program page: the sentence, the tags, and Edit. */
export function ProgramSectionCard({ summary }: Readonly<{ summary: SectionSummary }>) {
  const { t } = useTranslation();

  return (
    <Card
      className={cn(
        "border-border",
        summary.attention && "ring-1 ring-amber-300 dark:ring-amber-800",
      )}
    >
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{summary.title}</h3>
            <span className="text-xs text-muted-foreground">{summary.caption}</span>
            {summary.attention && (
              <IconAlertTriangle className="size-3.5 text-amber-600 dark:text-amber-500" />
            )}
          </div>
          <p className="mt-1 text-sm text-foreground">{summary.line}</p>
          {summary.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {summary.tags.map((tag) => (
                <TagBadge key={tag.label} tag={tag} />
              ))}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 self-start"
          render={<Link to={LOYALTY_PATHS.program} search={{ section: summary.key }} />}
        >
          {t("Edit")}
          <IconChevronRight size={14} />
        </Button>
      </CardContent>
    </Card>
  );
}

export function TagBadge({ tag }: Readonly<{ tag: SummaryTag }>) {
  switch (tag.tone) {
    case "warning":
      return (
        <Badge
          variant="secondary"
          className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500"
        >
          {tag.label}
        </Badge>
      );
    case "success":
      return (
        <Badge variant="secondary" className="bg-green-600/10 text-green-700 dark:text-green-500">
          {tag.label}
        </Badge>
      );
    case "accent":
      return (
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          {tag.label}
        </Badge>
      );
    default:
      return <Badge variant="secondary">{tag.label}</Badge>;
  }
}
