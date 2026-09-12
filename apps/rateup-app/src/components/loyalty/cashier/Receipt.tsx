import { Check, MessageCircle } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

import { formatMoney, formatNumber } from "./logic/format";
import type { Receipt as ReceiptData } from "./logic/cashier.types";
import type { WhatsAppPreview } from "./logic/message-preview";
import { CashierButton, Card, Divider, FONT, ReceiptRow, useTheme } from "./ui";

interface ReceiptProps {
  receipt: ReceiptData;
  preview: WhatsAppPreview;
  pointsName: string;
  currencySymbol: string;
  currencyCode: string;
  onNext: () => void;
  onStay: () => void;
  /** Only an earned receipt can be walked back, and only as a request for approval. */
  onUndo?: () => void;
  undoing?: boolean;
  /** Set once the undo has been filed, so the receipt says so where it happened. */
  undoNote?: string | null;
  /** Set when the drain replaced an estimate with a figure that did not match it. */
  divergedFrom?: number | null;
}

/**
 * What just happened, stated in full and left on screen.
 *
 * The whole reason this replaces a toast: the customer is still standing there asking what
 * happened, and a toast is gone before the answer is read out. On this app it is also the
 * fix for a second problem — `Notice.tsx` cannot render above a native `Modal`, and the
 * screen this replaces reported every outcome from inside one.
 */
export function Receipt({
  receipt,
  preview,
  pointsName,
  currencySymbol,
  currencyCode,
  onNext,
  onStay,
  onUndo,
  undoing,
  undoNote,
  divergedFrom,
}: Readonly<ReceiptProps>) {
  const { t } = useTheme();
  const money = (value: number) => formatMoney(value, currencyCode, currencySymbol);
  const first = receipt.customer.name.split(" ")[0] || receipt.customer.name;

  const provisional = Boolean(receipt.provisional);

  const title = (() => {
    switch (receipt.kind) {
      case "earned":
        // "About", because these are the estimate's numbers and the server may disagree.
        return provisional
          ? `About ${formatNumber(receipt.delta)} ${pointsName} — waiting to send`
          : `${formatNumber(receipt.delta)} ${pointsName} added`;
      case "redeemed":
        return receipt.pendingApproval
          ? `${receipt.rewardName} requested`
          : `${receipt.rewardName} redeemed`;
      case "coupon_used":
        return provisional
          ? `${receipt.rewardName} used — waiting to send`
          : `${receipt.rewardName} marked as used`;
      case "gift":
        return `${receipt.rewardName} given`;
      case "joined":
        return `${receipt.customer.name} has joined`;
    }
  })();

  const subtitle = [
    receipt.kind === "joined" ? null : receipt.customer.name,
    receipt.amount !== undefined ? money(receipt.amount) : null,
    receipt.note ? `bill ${receipt.note}` : null,
    receipt.code ? `code ${receipt.code}` : null,
    receipt.kind === "joined" && receipt.delta > 0
      ? `${formatNumber(receipt.delta)} ${pointsName} welcome bonus`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const changeLabel =
    receipt.delta >= 0 ? (receipt.kind === "joined" ? "Joining bonus" : "Earned") : "Redeemed";

  const waLabel = (() => {
    switch (preview.status) {
      // Nothing has been attempted yet. `no_event` would hide that a message *is* coming,
      // and every other status here would be a false statement.
      case "queued":
        return "Will be sent when this reaches the server";
      case "sent":
        return preview.mode === "text"
          ? `Sent to ${first} on WhatsApp as a message`
          : `Sent to ${first} on WhatsApp`;
      case "not_connected":
        return "Not sent — WhatsApp is not connected";
      case "program_inactive":
        return "Not sent — the program is not live";
      case "notifications_off":
        return "Not sent — notifications are switched off";
      case "no_trigger":
        return "Not sent — no message is set up for this";
      case "template_not_approved":
        return "Not sent — the template is still awaiting Meta";
      case "send_failed":
        return "Could not be sent";
      case "no_event":
        return null;
    }
  })();

  const tierValue = (() => {
    if (!receipt.tierAfter) return null;
    if (receipt.tierBefore && receipt.tierBefore !== receipt.tierAfter) {
      return `${receipt.tierBefore} → ${receipt.tierAfter}`;
    }
    if (receipt.nextTierName && receipt.amountToNext !== null) {
      return `${receipt.tierAfter} · ${money(receipt.amountToNext)} to ${receipt.nextTierName}`;
    }
    return receipt.tierAfter;
  })();

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            backgroundColor: t.status.open.soft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check size={20} color={t.status.open.fg} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: FONT.bold, fontSize: 18, color: t.fg1 }}>{title}</Text>
          {subtitle ? (
            <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg3 }}>{subtitle}</Text>
          ) : null}
        </View>
      </View>

      <Card padding={0}>
        {/* `before` is itself a cached number on a provisional receipt. Two provisional
            figures stacked without saying so is where staff get burned, so it says when
            the balance was last actually known. */}
        <ReceiptRow
          label={
            provisional && receipt.balanceAsOf
              ? `Balance before (as of ${clockTime(receipt.balanceAsOf)})`
              : "Balance before"
          }
          value={formatNumber(receipt.before)}
        />
        <Divider />
        <ReceiptRow
          label={provisional && receipt.delta !== 0 ? `${changeLabel} (estimate)` : changeLabel}
          value={`${receipt.delta >= 0 ? "+" : "−"}${formatNumber(Math.abs(receipt.delta))}`}
          tone={receipt.delta >= 0 ? "good" : "neutral"}
        />
        <Divider />
        <ReceiptRow
          label={provisional ? "Balance will be about" : "New balance"}
          value={`${formatNumber(receipt.after)} ${pointsName}`}
          // Never the emphatic row while it is still an estimate.
          strong={!provisional}
        />
        {tierValue ? (
          <>
            <Divider />
            <ReceiptRow label="Tier" value={tierValue} />
          </>
        ) : null}
      </Card>

      {/* The arithmetic, so an estimate can be defended out loud rather than just asserted. */}
      {provisional && receipt.estimate ? (
        <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: t.fg3, lineHeight: 18 }}>
          {estimateLine(receipt.estimate)}
        </Text>
      ) : null}

      {/* The counter already read the estimate out. When the server disagrees, the receipt
          shows both — silently swapping the number is how staff are made to look wrong. */}
      {divergedFrom !== null && divergedFrom !== undefined ? (
        <Text
          style={{
            fontFamily: FONT.semibold,
            fontSize: 12,
            color: t.status.pending.fg,
            lineHeight: 18,
          }}
        >
          Confirmed: {formatNumber(receipt.delta)} {pointsName}, not {formatNumber(divergedFrom)}.
        </Text>
      ) : null}

      {waLabel ? (
        <View
          style={{
            backgroundColor: t.surface2,
            borderRadius: 12,
            padding: 12,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MessageCircle
              size={14}
              color={preview.status === "sent" ? t.status.open.fg : t.status.pending.fg}
            />
            <Text
              style={{
                fontFamily: FONT.semibold,
                fontSize: 12,
                color: preview.status === "sent" ? t.status.open.fg : t.status.pending.fg,
                flex: 1,
              }}
            >
              {waLabel}
            </Text>
          </View>
          {preview.body ? (
            <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: t.fg1, lineHeight: 19 }}>
              {/* The wording is knowable — the template is cached locally — but the numbers
                  interpolated into it are the estimate's, so it is not quoted as final. */}
              {preview.status === "queued" ? "It will say, roughly:\n" : ""}
              {preview.body}
            </Text>
          ) : null}
        </View>
      ) : null}

      {receipt.pendingApproval ? (
        <Text style={{ fontFamily: FONT.medium, fontSize: 12, color: t.status.pending.fg }}>
          This reward needs approval before it can be handed over.
        </Text>
      ) : null}

      {undoNote ? (
        <Text style={{ fontFamily: FONT.medium, fontSize: 12, color: t.status.pending.fg }}>
          {undoNote}
        </Text>
      ) : null}

      <View style={{ gap: 8, paddingTop: 2 }}>
        <CashierButton label="Next customer" onPress={onNext} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <CashierButton label={`Stay with ${first}`} variant="ghost" onPress={onStay} />
          </View>
          {onUndo ? (
            <CashierButton
              label={undoing ? "Requesting…" : "Undo"}
              variant="ghost"
              onPress={onUndo}
              disabled={undoing || Boolean(undoNote)}
              loading={undoing}
              compact
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** "21:02" in the device's own zone — no library, and no locale to get wrong. */
function clockTime(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
}

/** The estimate's arithmetic, so it can be defended out loud rather than just asserted. */
function estimateLine(estimate: NonNullable<ReceiptData["estimate"]>): string {
  const parts = [`${formatNumber(estimate.basePoints)} under ${estimate.ruleName}`];
  if (estimate.tierMultiplier !== 1) parts.push(`then ×${estimate.tierMultiplier}`);
  return parts.join(", ");
}
