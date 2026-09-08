import { IconBrandWhatsapp, IconCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";

import { formatMoney } from "../../dashboard/loyalty/giveback/format.ts";
import type { Receipt as ReceiptData } from "./cashier.types.ts";
import type { WhatsAppPreview } from "./message-preview.ts";

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
}

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
}: Readonly<ReceiptProps>) {
  const { t } = useTranslation();
  const money = (value: number) => formatMoney(value, currencyCode, currencySymbol);
  const first = receipt.customer.name.split(" ")[0] || receipt.customer.name;

  const title = (() => {
    switch (receipt.kind) {
      case "earned":
        return t("{points} {name} added", {
          points: receipt.delta.toLocaleString(),
          name: pointsName,
        });
      case "redeemed":
        return receipt.pendingApproval
          ? t("{reward} requested", { reward: receipt.rewardName })
          : t("{reward} redeemed", { reward: receipt.rewardName });
      case "coupon_used":
        return t("{reward} marked as used", { reward: receipt.rewardName });
      case "gift":
        return t("{reward} given", { reward: receipt.rewardName });
      case "joined":
        return t("{name} has joined", { name: receipt.customer.name });
    }
  })();

  const subtitle = [
    receipt.kind === "joined" ? null : receipt.customer.name,
    receipt.amount !== undefined ? money(receipt.amount) : null,
    receipt.note ? t("bill {note}", { note: receipt.note }) : null,
    receipt.code ? t("code {code}", { code: receipt.code }) : null,
    receipt.kind === "joined" && receipt.delta > 0
      ? t("{points} {name} welcome bonus", { points: receipt.delta, name: pointsName })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const changeLabel =
    receipt.delta >= 0
      ? receipt.kind === "joined"
        ? t("Joining bonus")
        : t("Earned")
      : t("Redeemed");

  const waLabel = (() => {
    switch (preview.status) {
      case "sent":
        return t("Sent to {name} on WhatsApp", { name: first });
      case "not_connected":
        return t("Not sent — WhatsApp is not connected");
      case "program_inactive":
        return t("Not sent — the program is not live");
      case "notifications_off":
        return t("Not sent — notifications are switched off");
      case "no_trigger":
        return t("Not sent — no message is set up for this");
      case "template_not_approved":
        return t("Not sent — the template is still awaiting Meta");
      case "send_failed":
        return t("Could not be sent");
      case "no_event":
        return null;
    }
  })();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-600/10 text-green-700 dark:text-green-500">
          <IconCheck size={20} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="flex flex-col divide-y divide-border p-0">
          <Row label={t("Balance before")} value={`${receipt.before.toLocaleString()}`} />
          <Row
            label={changeLabel}
            value={`${receipt.delta >= 0 ? "+" : "−"}${Math.abs(receipt.delta).toLocaleString()}`}
            tone={receipt.delta >= 0 ? "good" : "neutral"}
          />
          <Row
            label={t("New balance")}
            value={`${receipt.after.toLocaleString()} ${pointsName}`}
            strong
          />
          {receipt.tierAfter && (
            <Row
              label={t("Tier")}
              value={
                receipt.tierBefore && receipt.tierBefore !== receipt.tierAfter
                  ? t("{before} → {after}", {
                      before: receipt.tierBefore,
                      after: receipt.tierAfter,
                    })
                  : receipt.nextTierName && receipt.amountToNext !== null
                    ? t("{tier} · {amount} to {next}", {
                        tier: receipt.tierAfter,
                        amount: money(receipt.amountToNext),
                        next: receipt.nextTierName,
                      })
                    : receipt.tierAfter
              }
            />
          )}
        </CardContent>
      </Card>

      {waLabel && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p
            className={`flex items-center gap-1.5 text-xs font-medium ${
              preview.status === "sent"
                ? "text-green-700 dark:text-green-500"
                : "text-amber-700 dark:text-amber-500"
            }`}
          >
            <IconBrandWhatsapp size={14} />
            {waLabel}
          </p>
          {preview.body && (
            <p className="mt-1.5 whitespace-pre-line text-sm text-foreground">{preview.body}</p>
          )}
        </div>
      )}

      {receipt.pendingApproval && (
        <p className="text-xs text-amber-700 dark:text-amber-500">
          {t(
            "This reward needs approval before it can be handed over — it is waiting in Activity.",
          )}
        </p>
      )}

      <div className="flex flex-col gap-2 pt-1">
        <Button className="h-12" onClick={onNext}>
          {t("Next customer")}
        </Button>
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={onStay}>
            {t("Stay with {name}", { name: first })}
          </Button>
          {onUndo && (
            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={onUndo}
              disabled={undoing}
            >
              {undoing ? t("Requesting…") : t("Undo")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: Readonly<{ label: string; value: string; strong?: boolean; tone?: "good" | "neutral" }>) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`tabular-nums ${strong ? "text-base font-semibold text-foreground" : tone === "good" ? "font-medium text-green-700 dark:text-green-500" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}
