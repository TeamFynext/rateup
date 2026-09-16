import * as Clipboard from "expo-clipboard";
import { Copy, Gift, Plus, QrCode, Ticket, Trophy } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

import type { CustomerRewardsResponse, PendingRedemption } from "@/api/loyalty/loyalty.type";

import { hapticSelect, hapticSuccess } from "./haptics";
import type { CashierStep } from "./logic/cashier.steps";
import { formatMoney, formatNumber } from "./logic/format";
import { maskPhone } from "./logic/maskPhone";
import {
  ActionRow,
  Badge,
  BalanceSlab,
  CashierButton,
  Card,
  Divider,
  FONT,
  InlineError,
  LABEL,
  NUM,
  StepScroll,
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
  /** Sends the member their QR card on WhatsApp. */
  onSendCard: () => void;
  sendingCard: boolean;
  /** What the last "Send card" did — sent, or why not — shown beside the button. */
  cardNotice: string | null;
}

/**
 * The customer in front of the counter: what is waiting, what they have, what to do.
 *
 * The balance carries the screen. It used to be one of four equal tiles — available,
 * lifetime, rewards in reach, spend to the next tier — distinguished only by being navy
 * instead of black, which left the one figure staff read out loud to be found by reading
 * all four. Lifetime points and total spend are a dashboard's numbers, so they moved down
 * beside the visits they summarise, and the balance took the panel.
 *
 * Filled rather than bordered because the customer reads it too, from the far side of the
 * counter, upside down.
 */
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
  onSendCard,
  sendingCard,
  cardNotice,
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

  // What this balance does next — the only reason the number is on screen at all.
  const footnote =
    [
      affordableCount > 0
        ? affordableCount === 1
          ? "1 reward in reach"
          : `${affordableCount} rewards in reach`
        : null,
      tier.next && tier.amountToNext !== null
        ? `${money(tier.amountToNext)} to ${tier.next.name}`
        : null,
    ]
      .filter(Boolean)
      .join("  ·  ") || null;

  return (
    <StepScroll
      footer={
        <>
          {/* One action per visit — the premise of this flow, and why each ends in a
              receipt. Adding a purchase is what nearly every visit is. */}
          <CashierButton
            label="Add purchase"
            icon={<Plus size={18} color="#FFFFFF" />}
            onPress={() => act("purchase")}
          />
          <ActionRow>
            <CashierButton
              label="Redeem"
              variant="outline"
              compact
              icon={<Trophy size={16} color={t.fg2} />}
              onPress={() => act("redeem")}
            />
            <CashierButton
              label="Coupon"
              variant="outline"
              compact
              icon={<Ticket size={16} color={t.fg2} />}
              onPress={() => act("coupon")}
            />
            <CashierButton
              label="Gift"
              variant="outline"
              compact
              icon={<Gift size={16} color={t.fg2} />}
              onPress={() => act("gift")}
            />
          </ActionRow>
        </>
      }
    >
      <InlineError message={error} />

      {/* The one thing staff forget: a reward already paid for, waiting to be handed over.
          Above the balance, because it is the reason this customer is standing there. */}
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

      <BalanceSlab
        name={customer.name}
        tierName={customer.currentTier?.name}
        tierColor={tierColor}
        value={formatNumber(customer.currentPoints)}
        unit={pointsName}
        pending={pendingDelta > 0 ? `+${formatNumber(pendingDelta)} waiting` : null}
        footnote={footnote}
      />

      {balanceAsOf ? (
        <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
          Saved from {relativeFromNow(balanceAsOf)} — waiting for the server.
        </Text>
      ) : null}

      {data.awaitingApproval.length > 0 ? (
        <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
          {data.awaitingApproval.length === 1
            ? "1 redemption is awaiting approval."
            : `${data.awaitingApproval.length} redemptions are awaiting approval.`}
        </Text>
      ) : null}

      <Card gap={14}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ ...NUM, fontFamily: FONT.regular, fontSize: 13, color: t.fg2, flex: 1 }}>
            {maskPhone(customer.phone)}
          </Text>
          {customer.status !== "active" ? <Badge label={customer.status} tone="warm" /> : null}
        </View>

        {/*
          The web also offers "Copy referral link", built from `VITE_FRONTEND_URL`. This app
          has no configured web origin (only `EXPO_PUBLIC_API_URL`), and guessing one from
          the API host would hand customers a broken link — so the code alone is offered
          here. Add the button once the app knows the web origin.
        */}
        {customer.referralCode ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...LABEL, color: t.fg4 }}>Referral code</Text>
              <Text style={{ ...NUM, fontFamily: FONT.semibold, fontSize: 14, color: t.fg1 }}>
                {customer.referralCode}
              </Text>
            </View>
            <CashierButton
              label="Copy"
              variant="outline"
              compact
              icon={<Copy size={14} color={t.fg2} />}
              onPress={() => copy(customer.referralCode)}
            />
          </View>
        ) : null}

        <Divider />

        {/* Their QR card. Sent on WhatsApp, so next time the counter scans instead of
            searching. Only deliverable while they have messaged the business recently —
            the notice says so, rather than the button pretending. */}
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...LABEL, color: t.fg4 }}>Member card</Text>
              <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
                {customer.cardSentAt
                  ? `Sent on WhatsApp ${relativeFromNow(customer.cardSentAt)}`
                  : "Not sent yet — they can also text CARD to get it."}
              </Text>
            </View>
            <CashierButton
              label={customer.cardSentAt ? "Send again" : "Send card"}
              variant="outline"
              compact
              icon={<QrCode size={15} color={t.fg2} />}
              onPress={onSendCard}
              disabled={sendingCard}
              loading={sendingCard}
            />
          </View>
          {cardNotice ? (
            <Text style={{ fontFamily: FONT.medium, fontSize: 12, color: t.fg2 }}>
              {cardNotice}
            </Text>
          ) : null}
        </View>
      </Card>

      <Card padding={0}>
        <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 }}>
          <Text style={{ ...LABEL, color: t.fg4 }}>Last visits</Text>
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
                  style={{ ...NUM, fontFamily: FONT.regular, fontSize: 13, color: t.fg3, flex: 1 }}
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
                    ...NUM,
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

        {/* The totals the four-tile grid used to carry, beside the visits they sum up. */}
        <Divider />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
            paddingVertical: 11,
            paddingHorizontal: 14,
          }}
        >
          <Text style={{ ...NUM, fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
            {formatNumber(customer.lifetimePoints)} {pointsName} lifetime
          </Text>
          <Text style={{ ...NUM, fontFamily: FONT.regular, fontSize: 12, color: t.fg3 }}>
            {money(customer.totalSpend)} spent
          </Text>
        </View>
      </Card>
    </StepScroll>
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
