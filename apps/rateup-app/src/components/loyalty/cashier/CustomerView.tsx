import * as Clipboard from "expo-clipboard";
import { Copy, Gift, Plus, Ticket, Trophy } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

import type { CustomerRewardsResponse, PendingRedemption } from "@/api/loyalty/loyalty.type";

import { hapticSelect, hapticSuccess } from "./haptics";
import type { CashierStep } from "./logic/cashier.steps";
import { formatMoney, formatNumber } from "./logic/format";
import { maskPhone } from "./logic/maskPhone";
import {
  Avatar,
  Badge,
  CashierButton,
  Card,
  Divider,
  FONT,
  InlineError,
  StatTile,
  useTheme,
  WarmAlert,
} from "./ui";
import { relativeFromNow } from "./relativeTime";

type CustomerAction = Extract<CashierStep, "purchase" | "redeem" | "coupon" | "gift">;

interface CustomerViewProps {
  data: CustomerRewardsResponse;
  currencyCode: string;
  /** How many of the rewards on offer this balance can buy. */
  affordableCount: number;
  /**
   * Points taken at the counter that the server has not been told about yet.
   *
   * Shown *beside* the balance rather than added into it: the balance is what the server
   * last said, and the two must stay distinguishable — the next member of staff reads this
   * number out.
   */
  pendingDelta: number;
  /** Set when this view is painted from the cache, so it can say how old it is. */
  balanceAsOf: string | null;
  onAction: (step: CustomerAction) => void;
  onMarkUsed: (pending: PendingRedemption) => void;
  markingUsed: boolean;
  /** A failure from a mark-used tap, shown here rather than as a toast. */
  error: string | null;
}

/** The customer in front of the counter: what is waiting, what they have, what to do. */
export function CustomerView({
  data,
  currencyCode,
  affordableCount,
  pendingDelta,
  balanceAsOf,
  onAction,
  onMarkUsed,
  markingUsed,
  error,
}: Readonly<CustomerViewProps>) {
  const { t } = useTheme();
  const { customer, program, tier } = data;
  const pointsName = program.pointsName;
  const money = (amount: number) => formatMoney(amount, currencyCode, program.currencySymbol);
  const tierColor = customer.currentTier?.color ?? tier.current?.color ?? null;

  const copy = (text: string) => {
    void Clipboard.setStringAsync(text)
      .then(hapticSuccess)
      .catch(() => {});
  };

  const act = (step: CustomerAction) => {
    hapticSelect();
    onAction(step);
  };

  return (
    <View style={{ gap: 14 }}>
      <InlineError message={error} />

      {balanceAsOf ? (
        <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
          Saved from {relativeFromNow(balanceAsOf)} — waiting for the server.
        </Text>
      ) : null}

      {/* The one thing staff forget: a reward already paid for, waiting to be handed over. */}
      {data.pendingRedemptions.map((pending) => (
        <WarmAlert key={pending.id} title={`Waiting: ${pending.reward?.name ?? "a reward"}`}>
          <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.warmStrong }}>
            {pending.kind === "redemption" ? "Redeemed " : "Given "}
            {relativeFromNow(pending.createdAt)} · code {pending.code}
          </Text>
          <CashierButton
            label="Mark as used"
            onPress={() => onMarkUsed(pending)}
            disabled={markingUsed}
            loading={markingUsed}
            compact
          />
        </WarmAlert>
      ))}

      {data.awaitingApproval.length > 0 ? (
        <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
          {data.awaitingApproval.length === 1
            ? "1 redemption is awaiting approval."
            : `${data.awaitingApproval.length} redemptions are awaiting approval.`}
        </Text>
      ) : null}

      <Card gap={18}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <Avatar name={customer.name} size={46} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <Text
                numberOfLines={1}
                style={{ fontFamily: FONT.bold, fontSize: 18, color: t.fg1, flexShrink: 1 }}
              >
                {customer.name}
              </Text>
              {customer.currentTier ? (
                <Badge label={customer.currentTier.name} dotColor={tierColor} />
              ) : null}
              {customer.status !== "active" ? <Badge label={customer.status} tone="warm" /> : null}
            </View>

            <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3 }}>
              {maskPhone(customer.phone)}
              {customer.referralCode ? ` · code ${customer.referralCode}` : ""}
            </Text>

            {/*
              The web also offers "Copy referral link", built from `VITE_FRONTEND_URL`.
              This app has no configured web origin (only `EXPO_PUBLIC_API_URL`), and
              guessing one from the API host would hand customers a broken link — so the
              code alone is offered here. Add the button once the app knows the web origin.
            */}
            {customer.referralCode ? (
              <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
                <CashierButton
                  label="Copy referral code"
                  variant="ghost"
                  compact
                  icon={<Copy size={14} color={t.fg3} />}
                  onPress={() => copy(customer.referralCode)}
                />
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatTile
            label="Available"
            value={formatNumber(customer.currentPoints)}
            unit={
              pendingDelta > 0
                ? `${pointsName} · +${formatNumber(pendingDelta)} waiting`
                : pointsName
            }
            highlight
          />
          <StatTile
            label="Lifetime"
            value={formatNumber(customer.lifetimePoints)}
            unit={pointsName}
          />
          <StatTile
            label="Can redeem now"
            value={String(affordableCount)}
            unit={affordableCount === 1 ? "reward" : "rewards"}
          />
          {tier.next ? (
            <StatTile
              label={`To ${tier.next.name}`}
              value={tier.amountToNext !== null ? money(tier.amountToNext) : "—"}
            />
          ) : (
            <StatTile label="Total spend" value={money(customer.totalSpend)} />
          )}
        </View>

        {/* One action per visit — the redesign's premise, and why each ends in a receipt. */}
        <View style={{ gap: 8 }}>
          <CashierButton
            label="Add purchase"
            icon={<Plus size={18} color="#FFFFFF" />}
            onPress={() => act("purchase")}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <CashierButton
                label="Redeem"
                variant="outline"
                icon={<Trophy size={17} color={t.fg2} />}
                onPress={() => act("redeem")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <CashierButton
                label="Coupon"
                variant="outline"
                icon={<Ticket size={17} color={t.fg2} />}
                onPress={() => act("coupon")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <CashierButton
                label="Gift"
                variant="outline"
                icon={<Gift size={17} color={t.fg2} />}
                onPress={() => act("gift")}
              />
            </View>
          </View>
        </View>
      </Card>

      <Card padding={0}>
        <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 }}>
          <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: t.fg1 }}>Last visits</Text>
        </View>
        {data.recentTransactions.length === 0 ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3 }}>
              No visits recorded yet.
            </Text>
          </View>
        ) : (
          data.recentTransactions.slice(0, 3).map((row, index) => (
            <React.Fragment key={row.id}>
              {index > 0 ? <Divider /> : null}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  paddingVertical: 11,
                  paddingHorizontal: 14,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3, flex: 1 }}
                >
                  {shortDate(row.createdAt)} ·{" "}
                  <Text style={{ color: t.fg1 }}>
                    {row.purchaseAmount !== null
                      ? money(row.purchaseAmount)
                      : row.description || row.source.replaceAll("_", " ")}
                  </Text>
                </Text>
                <Text
                  style={{
                    fontFamily: FONT.semibold,
                    fontSize: 13,
                    color: row.points >= 0 ? t.success : t.fg1,
                  }}
                >
                  {row.points >= 0 ? "+" : "−"}
                  {formatNumber(Math.abs(row.points))} {pointsName}
                </Text>
              </View>
            </React.Fragment>
          ))
        )}
      </Card>
    </View>
  );
}

/** "4 Sep" — enough to place a visit, without a second date library. */
function shortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
