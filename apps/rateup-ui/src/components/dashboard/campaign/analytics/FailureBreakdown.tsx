import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils";
import { WaFailureReasonGroup } from "@/types/enums.ts";
import type { CampaignFailureReason } from "@/types/global";

/**
 * Colour and outcome per reason group.
 *
 * The outcome column is the one that decides what to do next: a frequency cap
 * clears on its own and the retry engine will pick it up, a dead number never
 * will, and a template problem needs someone to go and fix the template.
 */
const GROUP_STYLE: Record<
  WaFailureReasonGroup,
  { swatch: string; badge: string; outcome: string }
> = {
  [WaFailureReasonGroup.LIMITED_BY_META]: {
    swatch: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
    outcome: "Retryable",
  },
  [WaFailureReasonGroup.INVALID_NUMBER]: {
    swatch: "bg-destructive",
    badge: "bg-destructive/10 text-destructive",
    outcome: "Permanent",
  },
  [WaFailureReasonGroup.TEMPLATE_ISSUE]: {
    swatch: "bg-destructive/60",
    badge: "bg-destructive/10 text-destructive",
    outcome: "Needs a fix",
  },
  [WaFailureReasonGroup.OTHER]: {
    swatch: "bg-muted-foreground/50",
    badge: "bg-muted text-muted-foreground",
    outcome: "Unclassified",
  },
};

const COLUMNS = "grid-cols-[10px_minmax(150px,1.6fr)_72px_104px_56px_56px_auto]";

/**
 * Why messages failed, grouped by cause and then by Meta's own error code.
 *
 * Counted over each failed recipient's most recent message, so a contact who
 * failed twice appears once and the totals reconcile with the funnel. The code
 * is on every row because it is the first thing support will ask for.
 */
export function FailureBreakdown({
  failures,
  totalFailed,
  isLoading,
  onDrillDown,
}: Readonly<{
  failures: CampaignFailureReason[] | undefined;
  totalFailed: number;
  isLoading: boolean;
  onDrillDown?: () => void;
}>) {
  const { t } = useTranslation("campaign.analytics");
  const retryable =
    failures?.find((row) => row.group === WaFailureReasonGroup.LIMITED_BY_META)?.count ?? 0;

  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-2.5 rounded-xl px-5 pt-4 pb-1.5 shadow-xs ring-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-[15px] font-semibold">{t("Why messages failed")}</span>
          <span className="text-muted-foreground text-[12.5px]">
            {t("{total} failed · {retryable} still retryable", {
              total: totalFailed.toLocaleString(),
              retryable: retryable.toLocaleString(),
            })}
          </span>
        </div>
        {onDrillDown ? (
          <Button
            variant="link"
            size="sm"
            className="h-auto shrink-0 gap-1 p-0 text-[12.5px]"
            onClick={onDrillDown}
          >
            {t("See failed recipients")}
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2 py-2">
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !failures?.length ? (
        <p className="text-muted-foreground py-10 text-center text-[13px]">
          {t("No failures — Meta accepted every message.")}
        </p>
      ) : (
        <>
          {/* The shape of the problem, before any numbers. */}
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded">
            {failures.map((row) => (
              <span
                key={row.group}
                className={cn("block", GROUP_STYLE[row.group].swatch)}
                style={{ width: `${(row.count / Math.max(totalFailed, 1)) * 100}%` }}
                title={`${row.label}: ${row.count}`}
              />
            ))}
          </div>

          <div className="flex flex-col">
            <div
              className={cn(
                "border-border text-muted-foreground/70 grid items-center gap-2.5 border-b pt-0.5 pb-1.5 text-[11px] font-semibold tracking-wider uppercase",
                COLUMNS,
              )}
            >
              <span />
              <span>{t("Reason")}</span>
              <span>{t("Code")}</span>
              <span>{t("Outcome")}</span>
              <span className="text-right">{t("Count")}</span>
              <span className="text-right">{t("Share")}</span>
              <span />
            </div>

            {failures.flatMap((row) =>
              row.codes.map((code) => (
                <div
                  key={`${row.group}-${code.code ?? "none"}`}
                  className={cn(
                    "border-border/60 grid items-center gap-2.5 border-b py-1.5 text-[13px]",
                    COLUMNS,
                  )}
                >
                  <span
                    className={cn("size-2.5 rounded-[3px]", GROUP_STYLE[row.group].swatch)}
                    aria-hidden
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{row.label}</span>
                    <span className="text-muted-foreground truncate text-[11.5px]">
                      {code.label}
                    </span>
                  </div>
                  <span className="bg-secondary text-secondary-foreground w-max rounded-md px-1.5 py-0.5 font-mono text-xs">
                    {code.code ?? "—"}
                  </span>
                  <div>
                    <Badge variant="secondary" className={GROUP_STYLE[row.group].badge}>
                      {t(GROUP_STYLE[row.group].outcome)}
                    </Badge>
                  </div>
                  <span className="text-right font-semibold tabular-nums">{code.count}</span>
                  <span className="text-muted-foreground text-right tabular-nums">
                    {((code.count / Math.max(totalFailed, 1)) * 100).toFixed(0)}%
                  </span>
                  <span />
                </div>
              )),
            )}
          </div>
        </>
      )}
    </div>
  );
}
