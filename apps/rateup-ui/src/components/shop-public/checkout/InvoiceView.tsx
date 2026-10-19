import { IconArrowLeft, IconPrinter } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { formatMoney } from "@/backend/commerce/shop.api";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

import { ShopUnavailable, StoreAvatar } from "../shared.tsx";
import { AddressBlock, OrderTotals } from "./OrderParts.tsx";
import { useCheckout } from "./useCheckout.ts";

/** A printable invoice: the browser's own Print → PDF is the download. */
export function InvoiceView({ token }: Readonly<{ token: string }>) {
  const { t } = useTranslation();
  const { query } = useCheckout(token, false);

  if (query.isPending) {
    return (
      <main className="mx-auto w-full max-w-3xl p-6">
        <Skeleton className="h-[70dvh] w-full rounded-2xl" />
      </main>
    );
  }
  if (query.isError) {
    return <ShopUnavailable title={t("We couldn't find this invoice")} />;
  }

  const { order, store } = query.data;
  if (order.status === "DRAFT") {
    return (
      <ShopUnavailable
        title={t("No invoice yet")}
        description={t("The invoice is ready once the order is placed.")}
      >
        <Button variant="outline" render={<Link to="/c/$token" params={{ token }} search={{}} />}>
          {t("Back to checkout")}
        </Button>
      </ShopUnavailable>
    );
  }
  const money = (value: number) => formatMoney(value, order.currency);

  return (
    <div className="min-h-dvh bg-muted/40 p-4 text-foreground print:bg-background print:p-0">
      <div className="mx-auto mb-3 flex w-full max-w-3xl items-center justify-between gap-2 print:hidden">
        <Button variant="ghost" render={<Link to="/c/$token" params={{ token }} search={{}} />}>
          <IconArrowLeft />
          {t("Back to order")}
        </Button>
        <Button onClick={() => globalThis.print()}>
          <IconPrinter />
          {t("Print")}
        </Button>
      </div>

      <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 rounded-2xl border border-border bg-card p-6 sm:p-10 print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <StoreAvatar name={store.name} logoUrl={store.logoUrl} className="size-12 text-lg" />
            <span className="text-lg font-bold">{store.name}</span>
          </div>
          <div className="text-right">
            <h1 className="font-display text-2xl font-extrabold">{t("Invoice")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("Order #{number}", { number: order.number })}
            </p>
            {order.placedAt && (
              <p className="text-sm text-muted-foreground">
                {dayjs(order.placedAt).format("MMMM D, YYYY")}
              </p>
            )}
          </div>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("Billed to")}
            </h2>
            <p className="text-sm font-semibold">{order.customerName ?? "—"}</p>
            {order.customerPhone && <p className="text-sm">{order.customerPhone}</p>}
            {order.customerEmail && <p className="text-sm">{order.customerEmail}</p>}
          </div>
          {order.shippingAddress?.line1 && (
            <div>
              <h2 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("Ship to")}
              </h2>
              <AddressBlock address={order.shippingAddress} />
            </div>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="py-2 font-semibold">{t("Item")}</th>
              <th className="py-2 text-right font-semibold">{t("Qty")}</th>
              <th className="py-2 text-right font-semibold">{t("Price")}</th>
              <th className="py-2 text-right font-semibold">{t("Amount")}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-border align-top">
                <td className="py-2.5 pr-2">
                  {item.title}
                  {item.variantTitle && item.variantTitle !== "Default" && (
                    <span className="block text-xs text-muted-foreground">{item.variantTitle}</span>
                  )}
                </td>
                <td className="py-2.5 text-right tabular-nums">{item.quantity}</td>
                <td className="py-2.5 text-right tabular-nums">{money(item.unitPrice)}</td>
                <td className="py-2.5 text-right tabular-nums">{money(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <OrderTotals order={order} className="ml-auto w-full max-w-xs" />

        <footer className="text-xs text-muted-foreground">
          {order.paymentStatus === "PAID" && order.paidAt
            ? t("Paid on {date}", { date: dayjs(order.paidAt).format("MMMM D, YYYY") })
            : t("Payment due")}
        </footer>
      </article>
    </div>
  );
}
