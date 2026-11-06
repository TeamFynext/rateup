import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { LoyaltyDashboardStats } from "@/backend/loyalty/dashboard/dashboard.query";
import { Card, CardContent } from "@/components/ui/card.tsx";

import type { GivebackResult } from "../giveback/calculateGiveback";
import { formatMoney, formatPercent } from "../giveback/format";
import { LOYALTY_PATHS } from "../paths.ts";
import type { ProgramState } from "./programState.ts";

interface ProgramStatusStripProps {
  programState: ProgramState;
  pointsName: string;
  currencySymbol: string;
  currencyCode: string;
  dashboard: LoyaltyDashboardStats | undefined;
  giveback: GivebackResult;
  templatesPending: number;
  hasWhatsappChannel: boolean;
}

/**
 * Four numbers a merchant glances at before editing anything: how many members, how many
 * points are out there, what the programme gives back, and whether anything needs chasing.
 */
export function ProgramStatusStrip({
  programState,
  pointsName,
  currencySymbol,
  currencyCode,
  dashboard,
  giveback,
  templatesPending,
  hasWhatsappChannel,
}: Readonly<ProgramStatusStripProps>) {
  const { t } = useTranslation();
  const draft = programState === "draft";
  const money = (amount: number) => formatMoney(amount, currencyCode, currencySymbol);
  const pct = giveback.givebackPctTop ?? giveback.givebackPct;
  const tierSplit = (dashboard?.tierDistribution ?? [])
    .filter((tier) => tier.id !== null)
    .map((tier) => `${tier.name} ${tier.value.toLocaleString()}`)
    .join(" · ");

  const attention = !hasWhatsappChannel
    ? {
        label: t("WhatsApp not connected"),
        to: LOYALTY_PATHS.settings,
        search: undefined,
        cta: t("Connect in Settings"),
      }
    : templatesPending > 0
      ? {
          label: t("{count} templates awaiting Meta", { count: templatesPending }),
          to: LOYALTY_PATHS.messages,
          search: { tab: "templates" as const },
          cta: t("Review in Messages"),
        }
      : null;

  return (
    <Card className="border-border">
      <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cell
          label={t("Members")}
          value={draft ? "—" : (dashboard?.metrics.totalMembers ?? 0).toLocaleString()}
          note={draft ? t("No members until you activate") : tierSplit || undefined}
        />
        <Cell
          label={t("{points} outstanding", { points: pointsName })}
          value={draft ? "—" : (dashboard?.liability.outstandingPoints ?? 0).toLocaleString()}
          note={
            draft
              ? t("Nothing issued yet")
              : dashboard?.liability.monetaryValue != null
                ? t("≈ {value} if all redeemed", {
                    value: money(dashboard.liability.monetaryValue),
                  })
                : undefined
          }
        />
        <Cell
          label={t("Giveback")}
          value={pct === null ? "—" : formatPercent(pct)}
          note={pct === null ? t("Needs a typical spend and a priced reward") : t("of revenue")}
        />
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">{t("Needs attention")}</p>
          {attention ? (
            <>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-500">
                {attention.label}
              </p>
              <Link
                to={attention.to}
                search={attention.search}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                {attention.cta} <IconArrowRight size={12} />
              </Link>
            </>
          ) : (
            <p className="text-sm font-medium text-foreground">{t("Nothing right now")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Cell({ label, value, note }: Readonly<{ label: string; value: string; note?: string }>) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
