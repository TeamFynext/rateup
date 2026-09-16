import { MessageCircle } from "lucide-react-native";
import React from "react";
import { Text, View } from "react-native";

import { formatMoney, formatNumber } from "./logic/format";
import type { Receipt as ReceiptData } from "./logic/cashier.types";
import type { WhatsAppPreview } from "./logic/message-preview";
import {
  ActionRow,
  CashierButton,
  Divider,
  FONT,
  LABEL,
  NUM,
  Perforation,
  ReceiptRow,
  Slip,
  StepScroll,
  useTheme,
} from "./ui";

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
 *
 * It is the only step that is a record rather than a control, and the only one the
 * customer watches, so it is the one place the design is allowed a voice: a slip, torn
 * across, the figure set large and centred over the accounting that explains it. Every
 * other step stays plain so this one lands.
 *
 * Green is reserved for what the server has confirmed. A provisional receipt keeps its
 * figure in the neutral ink and says it is waiting — the same rule the numbers follow.
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

  /** What was done, in one word or two. "About" where the server has not confirmed it. */
  const eyebrow = (() => {
    switch (receipt.kind) {
      case "earned":
        return provisional ? "About — waiting to send" : "Added";
      case "redeemed":
        return receipt.pendingApproval ? "Requested" : "Redeemed";
      case "coupon_used":
        return provisional ? "Used — waiting to send" : "Marked as used";
      case "gift":
        return "Given";
      case "joined":
        return "Joined";
    }
  })();

  /** The one thing on the slip: the points that moved, or the reward that did. */
  const pointsHeadline = receipt.kind === "earned" || receipt.kind === "joined";
  const headline = pointsHeadline
    ? `${receipt.delta >= 0 ? "+" : "−"}${formatNumber(Math.abs(receipt.delta))}`
    : (receipt.rewardName ?? "Reward");
  const headlineUnit = pointsHeadline
    ? pointsName
    : receipt.kind === "joined"
      ? null
      : receipt.customer.name;

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
    <StepScroll
      footer={
        <>
          <CashierButton label="Next customer" onPress={onNext} />
          <ActionRow>
            <CashierButton label={`Stay with ${first}`} variant="ghost" compact onPress={onStay} />
            {onUndo ? (
              <CashierButton
                label={undoing ? "Requesting…" : "Undo"}
                variant="ghost"
                compact
                onPress={onUndo}
                disabled={undoing || Boolean(undoNote)}
                loading={undoing}
              />
            ) : null}
          </ActionRow>
        </>
      }
    >
      <Slip>
        {/* The head of the slip: what moved, centred, in the largest type the app has. */}
        <View style={{ paddingHorizontal: 18, paddingTop: 22, paddingBottom: 18, gap: 6 }}>
          <Text
            style={{
              ...LABEL,
              textAlign: "center",
              color: provisional ? t.status.pending.fg : t.fg4,
            }}
          >
            {eyebrow}
          </Text>

          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
            style={{
              ...(pointsHeadline ? NUM : null),
              fontFamily: FONT.black,
              fontSize: pointsHeadline ? 46 : 26,
              lineHeight: pointsHeadline ? 52 : 32,
              letterSpacing: pointsHeadline ? -1.5 : -0.2,
              textAlign: "center",
              // Green is what the server has confirmed. An estimate stays in the ink.
              color: pointsHeadline && receipt.delta > 0 && !provisional ? t.success : t.fg1,
            }}
          >
            {headline}
          </Text>

          {headlineUnit ? (
            <Text
              numberOfLines={1}
              style={{
                fontFamily: FONT.medium,
                fontSize: 14,
                textAlign: "center",
                color: t.fg3,
              }}
            >
              {headlineUnit}
            </Text>
          ) : null}

          {subtitle ? (
            <Text
              style={{
                ...NUM,
                fontFamily: FONT.regular,
                fontSize: 13,
                textAlign: "center",
                color: t.fg3,
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        <Perforation />

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
      </Slip>

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
            ...NUM,
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
        <View style={{ backgroundColor: t.surface2, borderRadius: 12, padding: 12, gap: 6 }}>
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
    </StepScroll>
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
