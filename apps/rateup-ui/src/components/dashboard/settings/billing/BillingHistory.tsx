import { IconDownload, IconFileInvoice, IconRefresh } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { OrgInvoice } from "@/backend/payment/payment.api";
import type { PaymentOrder } from "@/components/settings/billing-parts/shared.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { formatIsoDateString } from "@/utils/dateTime.ts";

/**
 * One line of billing history.
 *
 * Invoices and orders each record only part of the story, which is why this is a single
 * merged list rather than two: an order is created once per checkout, so it never records
 * a renewal charge, while an invoice exists only for a charge that was actually raised, so
 * it never records a checkout the customer abandoned or that failed. Charges come from
 * invoices (complete, and downloadable); orders contribute only the attempts that never
 * became a charge.
 *
 * Conversation packs are the exception to all of that: a pack is a one-off charge with no
 * subscription and no Razorpay invoice behind it, so its order *is* the record — paid,
 * pending and failed alike — and it is listed on its own terms rather than as a failed
 * subscription attempt.
 */
interface HistoryRow {
  key: string;
  date: string | undefined;
  amount: number | undefined;
  currency: string | undefined;
  status: string;
  tone: "paid" | "pending" | "failed";
  /** Razorpay's hosted invoice page. Absent on failed attempts — nothing was invoiced. */
  url: string | null;
  period: string | null;
  reference: string;
  subscriptionId: string | undefined;
  /** What was bought, when the row is not a plan charge — a pack name today. */
  label: string | null;
}

/** Unix seconds from Razorpay; the date helpers want an ISO string. */
function fromUnix(seconds: number | null | undefined) {
  return seconds ? new Date(seconds * 1000).toISOString() : undefined;
}

function money(amount: number | undefined, currency: string | undefined) {
  if (amount === undefined) return "—";
  const symbol = currency === "INR" ? "₹" : "$";
  return `${symbol}${amount.toLocaleString(currency === "INR" ? "en-IN" : "en-US")}`;
}

function toneVariant(tone: HistoryRow["tone"]) {
  if (tone === "paid") return "default" as const;
  if (tone === "pending") return "secondary" as const;
  return "destructive" as const;
}

export function BillingHistory({
  invoices,
  orders,
  isPending,
  refresh,
  isRefetching,
}: {
  invoices: OrgInvoice[] | undefined;
  orders: PaymentOrder[] | undefined;
  isPending: boolean;
  refresh: () => void;
  isRefetching: boolean;
}) {
  const { t: translations } = useTranslation();
  const [selected, setSelected] = useState<HistoryRow | null>(null);
  const selectedUrl = selected?.url;

  const rows = useMemo<HistoryRow[]>(() => {
    const invoiceRows: HistoryRow[] = (invoices ?? []).map((invoice) => ({
      key: invoice.id,
      date: fromUnix(invoice.paidAt ?? invoice.issuedAt),
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      tone: invoice.status === "paid" ? "paid" : invoice.status === "issued" ? "pending" : "failed",
      url: invoice.url,
      period:
        invoice.billingStart && invoice.billingEnd
          ? `${formatIsoDateString(fromUnix(invoice.billingStart))} — ${formatIsoDateString(fromUnix(invoice.billingEnd))}`
          : null,
      reference: invoice.id,
      subscriptionId: invoice.subscriptionId,
      label: null,
    }));

    // A subscription that raised an invoice is already represented above; only surface the
    // checkouts that never produced one, so a paid order is not counted twice.
    const invoicedSubscriptions = new Set(invoiceRows.map((row) => row.subscriptionId));
    const attemptRows: HistoryRow[] = (orders ?? [])
      .filter(
        (order) =>
          order.planType !== "ADDON" &&
          order.subscriptionId &&
          !invoicedSubscriptions.has(order.subscriptionId),
      )
      .map((order) => ({
        key: order.id,
        date: order.createdAt,
        amount: order.amount,
        currency: order.currency,
        status: order.paymentStatus === "FAILED" ? "failed" : "incomplete",
        tone: order.paymentStatus === "FAILED" ? "failed" : "pending",
        url: null,
        period: null,
        reference: order.id,
        subscriptionId: order.subscriptionId,
        label: null,
      }));

    // Packs never raise an invoice, so unlike a plan checkout a successful one is only
    // ever recorded here — list it as the paid charge it is.
    const addonRows: HistoryRow[] = (orders ?? [])
      .filter((order) => order.planType === "ADDON")
      .map((order) => ({
        key: order.id,
        date: order.createdAt,
        amount: order.amount,
        currency: order.currency,
        status:
          order.paymentStatus === "SUCCESS"
            ? "paid"
            : order.paymentStatus === "FAILED"
              ? "failed"
              : "incomplete",
        tone:
          order.paymentStatus === "SUCCESS"
            ? "paid"
            : order.paymentStatus === "FAILED"
              ? "failed"
              : "pending",
        url: null,
        period: null,
        reference: order.id,
        subscriptionId: undefined,
        label: order.displayName ?? order.name ?? "Conversation packs",
      }));

    return [...invoiceRows, ...attemptRows, ...addonRows].sort(
      (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime(),
    );
  }, [invoices, orders]);

  return (
    <>
      <Card id="billing-history" className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2">
            <IconFileInvoice className="h-4 w-4" />
            {translations("Billing History")}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isRefetching}
            className="flex items-center gap-2"
          >
            <IconRefresh className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
            {translations("Refresh")}
          </Button>
        </div>

        {isPending ? (
          <div className="space-y-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : !rows.length ? (
          <div className="flex flex-col items-center justify-center gap-1 p-8 text-center">
            <IconFileInvoice className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm">{translations("Nothing billed yet")}</p>
            <p className="text-xs text-muted-foreground">
              {translations("Your charges and invoices appear here after your first payment.")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition-colors hover:border-primary/30"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {formatIsoDateString(row.date)}
                    {row.label && (
                      <span className="ml-2 font-normal text-muted-foreground">· {row.label}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.period ?? row.reference}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">{money(row.amount, row.currency)}</span>
                  <Badge variant={toneVariant(row.tone)} className="capitalize">
                    {translations(row.status)}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(row)}>
                    {translations("Details")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    disabled={!row.url}
                    onClick={() => {
                      // noopener/noreferrer: the new tab must not get a handle on this one.
                      if (row.url) window.open(row.url, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <IconDownload className="h-4 w-4" />
                    {translations("Download")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{translations("Billing Details")}</DialogTitle>
            <DialogDescription>{formatIsoDateString(selected?.date)}</DialogDescription>
          </DialogHeader>

          <dl className="space-y-3 text-sm">
            {selected?.label && (
              <>
                <DetailRow label={translations("Item")}>{selected.label}</DetailRow>
                <Separator />
              </>
            )}
            <DetailRow label={translations("Amount")}>
              {money(selected?.amount, selected?.currency)}
            </DetailRow>
            <Separator />
            <DetailRow label={translations("Status")}>
              <Badge variant={toneVariant(selected?.tone ?? "pending")} className="capitalize">
                {translations(selected?.status ?? "")}
              </Badge>
            </DetailRow>
            {selected?.period && (
              <>
                <Separator />
                <DetailRow label={translations("Billing period")}>{selected.period}</DetailRow>
              </>
            )}
            <Separator />
            <DetailRow label={translations("Reference")}>
              <span className="font-mono text-xs">{selected?.reference}</span>
            </DetailRow>
            {selected?.subscriptionId && (
              <>
                <Separator />
                <DetailRow label={translations("Subscription")}>
                  <span className="font-mono text-xs">{selected.subscriptionId}</span>
                </DetailRow>
              </>
            )}
          </dl>

          {selectedUrl && (
            <Button
              className="gap-1"
              onClick={() => window.open(selectedUrl, "_blank", "noopener,noreferrer")}
            >
              <IconDownload className="h-4 w-4" />
              {translations("Download invoice")}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
