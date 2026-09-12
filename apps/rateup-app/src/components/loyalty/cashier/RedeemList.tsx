import { Lock } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

import type { CustomerReward, LoyaltyReward } from "@/api/loyalty/loyalty.type";

import { formatNumber } from "./logic/format";
import { CashierButton, FONT, FormHeader, InlineError, useTheme } from "./ui";

export interface RedeemRow {
  reward: LoyaltyReward;
  eligible: boolean;
  /** Why it is greyed: how far off, or which tiers only. */
  note: string;
}

interface RedeemListProps {
  customerName: string;
  currentPoints: number;
  pointsName: string;
  /** Every live reward, so greyed rows still say how far off they are. */
  catalogue: LoyaltyReward[];
  /** The rewards this customer may actually redeem right now (tier-filtered by the API). */
  available: CustomerReward[];
  tierNames: Map<string, string>;
  /** Points a typical visit earns; null when the programme has no typical spend. */
  pointsPerVisit: number | null;
  redeemingId: string | null;
  error: string | null;
  /**
   * Whether the server is reachable, as far as the last request could tell.
   *
   * Redeeming is the one counter action that cannot wait for the network — it spends the
   * balance against stock and usage caps no client can see. Saying so *before* the tap is
   * the difference between a refusal and a surprise.
   */
  online: boolean;
  onBack: () => void;
  onRedeem: (reward: LoyaltyReward) => void;
}

/**
 * Affordable first. Greyed rewards say how far off they are, so staff have something
 * encouraging to read out instead of "no".
 */
export function RedeemList({
  customerName,
  currentPoints,
  pointsName,
  catalogue,
  available,
  tierNames,
  pointsPerVisit,
  redeemingId,
  error,
  online,
  onBack,
  onRedeem,
}: Readonly<RedeemListProps>) {
  const { t } = useTheme();
  const rows = buildRows({
    catalogue,
    available,
    currentPoints,
    pointsName,
    tierNames,
    pointsPerVisit,
  });

  return (
    <View style={{ gap: 16 }}>
      <FormHeader title="Redeem a reward" subtitle={customerName} onBack={onBack} />

      <Text style={{ fontFamily: FONT.medium, fontSize: 13, color: t.fg3 }}>
        {formatNumber(currentPoints)} {pointsName} available
      </Text>

      <InlineError message={error} />

      {!online ? (
        <View
          style={{
            backgroundColor: t.warmSoft,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <Text
            style={{ fontFamily: FONT.medium, fontSize: 12, color: t.warmStrong, lineHeight: 18 }}
          >
            Redeeming spends {pointsName}, so it has to be checked on the server and can&apos;t wait
            for the network. Adding a purchase or giving a gift still works.
          </Text>
        </View>
      ) : null}

      {rows.length === 0 ? (
        <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3 }}>
          No rewards are set up yet.
        </Text>
      ) : null}

      <View style={{ gap: 8 }}>
        {rows.map(({ reward, eligible, note }) => (
          <View
            key={reward.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: t.border1,
              backgroundColor: eligible ? t.surface : t.surface2,
              opacity: eligible ? 1 : 0.85,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: FONT.semibold,
                  fontSize: 14,
                  color: eligible ? t.fg1 : t.fg3,
                }}
              >
                {reward.name}
              </Text>
              <Text
                style={{
                  fontFamily: FONT.regular,
                  fontSize: 12,
                  color: eligible ? t.fg3 : t.status.pending.fg,
                }}
              >
                {note}
              </Text>
            </View>
            {eligible ? (
              <CashierButton
                label={redeemingId === reward.id ? "Redeeming…" : "Redeem"}
                variant={reward.pointsCost >= 500 ? "primary" : "outline"}
                compact
                disabled={redeemingId !== null}
                loading={redeemingId === reward.id}
                onPress={() => onRedeem(reward)}
              />
            ) : (
              <Lock size={16} color={t.fg4} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * The rows, in the order they are read out: what she can have now, cheapest first, then
 * what she cannot and why.
 *
 * Ported from the web's inline computation. It is kept as a named export so the eligibility
 * rule has one home — the note is the sentence staff say out loud, and getting it wrong is
 * worse than not showing the row at all.
 */
export function buildRows({
  catalogue,
  available,
  currentPoints,
  pointsName,
  tierNames,
  pointsPerVisit,
}: Readonly<{
  catalogue: LoyaltyReward[];
  available: CustomerReward[];
  currentPoints: number;
  pointsName: string;
  tierNames: Map<string, string>;
  pointsPerVisit: number | null;
}>): RedeemRow[] {
  const availableIds = new Set(available.map((reward) => reward.id));

  return catalogue
    .filter((reward) => reward.status === "ACTIVE" && reward.rewardType !== "assigned")
    .map((reward) => {
      const restricted = (reward.availableForTiers?.length ?? 0) > 0;
      const inTier = !restricted || availableIds.has(reward.id);
      const affordable = reward.pointsCost <= currentPoints;
      const eligible =
        inTier &&
        affordable &&
        (reward.rewardType === "coupon" || availableIds.has(reward.id) || !restricted);

      let note: string;
      if (!inTier) {
        const names = (reward.availableForTiers ?? []).map((id) => tierNames.get(id) ?? id);
        note = `${names.join(" & ")} only`;
      } else if (!affordable) {
        const short = reward.pointsCost - currentPoints;
        const visits =
          pointsPerVisit && pointsPerVisit > 0 ? Math.ceil(short / pointsPerVisit) : null;
        note =
          visits !== null
            ? `${formatNumber(short)} ${pointsName} short — about ${visits} more visits`
            : `${formatNumber(short)} ${pointsName} short`;
      } else if (reward.pointsCost === 0) {
        note = `No ${pointsName} needed`;
      } else {
        note = `${formatNumber(reward.pointsCost)} ${pointsName} · leaves ${formatNumber(
          currentPoints - reward.pointsCost,
        )}`;
      }
      return { reward, eligible, note };
    })
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) || a.reward.pointsCost - b.reward.pointsCost,
    );
}
