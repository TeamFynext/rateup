import {
  IconArrowRight,
  IconCopy,
  IconGift,
  IconLink,
  IconPlus,
  IconTicket,
  IconTrophy,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type {
  CustomerRewardsResponse,
  PendingRedemption,
} from "@/backend/loyalty/cashier/cashier.api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { PremiumAvatar } from "@/components/ui/premium-avatar.tsx";
import { FRONTEND_URL } from "@/utils/constants.ts";

import { formatMoney } from "../../dashboard/loyalty/giveback/format.ts";
import { LOYALTY_PATHS } from "../../dashboard/loyalty/paths.ts";
import type { CashierStep } from "./cashier.search.ts";
import { maskPhone } from "./maskPhone.ts";

interface CustomerViewProps {
  data: CustomerRewardsResponse;
  orgId: string | undefined;
  currencyCode: string;
  /** How many of the rewards on offer this balance can buy. */
  affordableCount: number;
  onAction: (step: Extract<CashierStep, "purchase" | "redeem" | "coupon" | "gift">) => void;
  onMarkUsed: (pending: PendingRedemption) => void;
  markingUsed: boolean;
  /** Off on the standalone staff device, which has no Activity page. */
  showFullHistory: boolean;
}

/** The customer in front of the counter: what is waiting, what they have, what to do. */
export function CustomerView({
  data,
  orgId,
  currencyCode,
  affordableCount,
  onAction,
  onMarkUsed,
  markingUsed,
  showFullHistory,
}: Readonly<CustomerViewProps>) {
  const { t } = useTranslation();
  const { customer, program, tier } = data;
  const pointsName = program.pointsName;
  const money = (amount: number) => formatMoney(amount, currencyCode, program.currencySymbol);
  const tierColor = customer.currentTier?.color ?? tier.current?.color ?? null;

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(done);
    } catch {
      toast.error(t("Could not copy"));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* The one thing staff forget: a reward already paid for, waiting to be handed over. */}
      {data.pendingRedemptions.map((pending) => (
        <Alert
          key={pending.id}
          className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <IconTicket />
          <AlertTitle>
            {t("Waiting: {reward}", { reward: pending.reward?.name ?? t("a reward") })}
          </AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              {pending.kind === "redemption"
                ? t("Redeemed {ago} · code {code}", {
                    ago: dayjs(pending.createdAt).fromNow(),
                    code: pending.code,
                  })
                : t("Given {ago} · code {code}", {
                    ago: dayjs(pending.createdAt).fromNow(),
                    code: pending.code,
                  })}
            </span>
            <Button size="sm" onClick={() => onMarkUsed(pending)} disabled={markingUsed}>
              {t("Mark as used")}
            </Button>
          </AlertDescription>
        </Alert>
      ))}

      {data.awaitingApproval.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("{count} redemption awaiting approval in Activity.", {
            count: data.awaitingApproval.length,
          })}
        </p>
      )}

      <Card className="border-border">
        <CardContent className="flex flex-col gap-5 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <PremiumAvatar name={customer.name} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-foreground">{customer.name}</h2>
                {customer.currentTier && (
                  <Badge variant="secondary" className="gap-1.5">
                    {tierColor && (
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: tierColor }}
                      />
                    )}
                    {customer.currentTier.name}
                  </Badge>
                )}
                {customer.status !== "active" && <Badge variant="outline">{customer.status}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {maskPhone(customer.phone)}
                {customer.createdAt
                  ? ` · ${t("joined {date}", { date: dayjs(customer.createdAt).format("MMM YYYY") })}`
                  : ""}
                {customer.referralCode
                  ? ` · ${t("referral code {code}", { code: customer.referralCode })}`
                  : ""}
              </p>
              {customer.referralCode && (
                <div className="mt-1 flex gap-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => copy(customer.referralCode, t("Referral code copied"))}
                  >
                    <IconCopy size={14} /> {t("Copy code")}
                  </Button>
                  {orgId && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() =>
                        copy(
                          `${FRONTEND_URL}/loyalty/${orgId}/register?refer_code=${customer.referralCode}`,
                          t("Referral link copied"),
                        )
                      }
                    >
                      <IconLink size={14} /> {t("Copy referral link")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label={t("Available")}
              value={customer.currentPoints.toLocaleString()}
              unit={pointsName}
              highlight
            />
            <Stat
              label={t("Lifetime")}
              value={customer.lifetimePoints.toLocaleString()}
              unit={pointsName}
            />
            <Stat
              label={t("Can redeem now")}
              value={String(affordableCount)}
              unit={affordableCount === 1 ? t("reward") : t("rewards")}
            />
            {tier.next ? (
              <Stat
                label={t("To {tier}", { tier: tier.next.name })}
                value={tier.amountToNext !== null ? money(tier.amountToNext) : "—"}
              />
            ) : (
              <Stat label={t("Total spend")} value={money(customer.totalSpend)} />
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Button className="h-12" onClick={() => onAction("purchase")}>
              <IconPlus size={18} /> {t("Add purchase")}
            </Button>
            <Button variant="outline" className="h-12" onClick={() => onAction("redeem")}>
              <IconTrophy size={18} /> {t("Redeem a reward")}
            </Button>
            <Button variant="outline" className="h-12" onClick={() => onAction("coupon")}>
              <IconTicket size={18} /> {t("Coupon code")}
            </Button>
            <Button variant="outline" className="h-12" onClick={() => onAction("gift")}>
              <IconGift size={18} /> {t("Grant a gift")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{t("Last visits")}</p>
            {showFullHistory && (
              <Link
                to={LOYALTY_PATHS.activity}
                search={{ filter: "all", page: 1, customerId: customer.id }}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("Full history")} <IconArrowRight size={12} />
              </Link>
            )}
          </div>
          {data.recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No visits recorded yet.")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data.recentTransactions.slice(0, 3).map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    {dayjs(row.createdAt).format("D MMM")}
                    {" · "}
                    <span className="text-foreground">
                      {row.purchaseAmount !== null
                        ? money(row.purchaseAmount)
                        : row.description || row.source.replaceAll("_", " ")}
                    </span>
                  </span>
                  <span
                    className={
                      row.points >= 0
                        ? "tabular-nums font-medium text-green-700 dark:text-green-500"
                        : "tabular-nums font-medium text-foreground"
                    }
                  >
                    {row.points >= 0 ? "+" : "−"}
                    {Math.abs(row.points).toLocaleString()} {pointsName}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  highlight,
}: Readonly<{ label: string; value: string; unit?: string; highlight?: boolean }>) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-xl font-semibold tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </p>
      {unit && <p className="text-xs text-muted-foreground">{unit}</p>}
    </div>
  );
}
