import { IconLock } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { createContext, useContext } from "react";
import { useTranslation } from "react-i18next";

import {
  formatMoney,
  type PublicCheckout,
  type PublicOrder,
  type ShopAddress,
} from "@/backend/commerce/shop.api";
import { cn } from "@/lib/utils.ts";

import { StoreAvatar } from "../shared.tsx";

/**
 * Inside the checkout form, sections are flat headed blocks on the page, as in Shopify's
 * checkout; elsewhere (order status, hand-off) they stay cards.
 */
const FlatSections = createContext(false);
export const FlatCheckoutSections = FlatSections.Provider;

/** The checkout's own section: a card, or a flat block inside the checkout form. */
export function CheckoutSection({
  title,
  action,
  children,
  className,
}: Readonly<{
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}>) {
  const flat = useContext(FlatSections);
  return (
    <section
      aria-label={title}
      className={cn(
        "flex flex-col gap-3",
        !flat && "rounded-2xl border border-border bg-card p-4",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-2">
          {title && (
            <h2 className={flat ? "text-xl font-bold tracking-tight" : "text-[15px] font-bold"}>
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function CheckoutHeader({
  store,
  wide = false,
}: Readonly<{ store: PublicCheckout["store"]; wide?: boolean }>) {
  const { t } = useTranslation();
  const brand = (
    <span className="inline-flex min-w-0 items-center gap-2">
      <StoreAvatar name={store.name} logoUrl={store.logoUrl} className="size-8 text-sm" />
      <span className="truncate font-bold">{store.name}</span>
    </span>
  );
  return (
    <header className="border-b border-border bg-background print:hidden">
      <div
        className={cn(
          "mx-auto flex w-full items-center justify-between gap-3 px-4 py-3.5",
          wide ? "max-w-5xl" : "max-w-2xl",
        )}
      >
        {store.storefrontEnabled ? (
          <Link
            to="/s/$slug"
            params={{ slug: store.slug }}
            search={{}}
            className="min-w-0 text-foreground"
          >
            {brand}
          </Link>
        ) : (
          brand
        )}
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <IconLock className="size-3.5" />
          {t("Secure checkout")}
        </span>
      </div>
    </header>
  );
}

export function OrderLines({ order }: Readonly<{ order: PublicOrder }>) {
  const { t } = useTranslation();
  return (
    <ul className="flex flex-col gap-3">
      {order.items.map((item) => (
        <li key={item.id} className="flex items-center gap-3">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="size-11 shrink-0 rounded-lg bg-muted" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate">{item.title}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {[
                item.variantTitle && item.variantTitle !== "Default" ? item.variantTitle : null,
                item.quantity > 1 ? t("Qty {count}", { count: item.quantity }) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
          <span className="shrink-0 tabular-nums">
            {formatMoney(item.lineTotal, order.currency)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Whether the tax is already inside the line prices: then the total has no separate tax line. */
export function taxIncluded(order: PublicOrder): boolean {
  const withoutTax =
    order.subtotal - order.discountTotal - order.pointsDiscount + order.shippingTotal;
  return Math.abs(order.total - withoutTax) < 0.01;
}

export function OrderTotals({
  order,
  className,
}: Readonly<{ order: PublicOrder; className?: string }>) {
  const { t } = useTranslation();
  const money = (value: number) => formatMoney(value, order.currency);
  const included = taxIncluded(order);
  const row = "flex justify-between gap-3";

  return (
    <dl className={cn("flex flex-col gap-1.5 text-sm", className)}>
      <div className={row}>
        <dt className="text-muted-foreground">{t("Subtotal")}</dt>
        <dd className="tabular-nums">{money(order.subtotal)}</dd>
      </div>
      {order.discountTotal > 0 && (
        <div className={row}>
          <dt className="text-muted-foreground">
            {order.discountCode ? t("Coupon {code}", { code: order.discountCode }) : t("Discount")}
          </dt>
          <dd className="text-green-700 tabular-nums dark:text-green-500">
            −{money(order.discountTotal)}
          </dd>
        </div>
      )}
      {order.pointsDiscount > 0 && (
        <div className={row}>
          <dt className="text-muted-foreground">{t("Points")}</dt>
          <dd className="text-green-700 tabular-nums dark:text-green-500">
            −{money(order.pointsDiscount)}
          </dd>
        </div>
      )}
      <div className={row}>
        <dt className="text-muted-foreground">
          {order.shippingRate
            ? t("Delivery · {name}", { name: order.shippingRate.name })
            : t("Delivery")}
        </dt>
        <dd className="tabular-nums">
          {order.shippingRate
            ? order.shippingTotal > 0
              ? money(order.shippingTotal)
              : t("Free")
            : "—"}
        </dd>
      </div>
      {order.taxTotal > 0 && !included && (
        <div className={row}>
          <dt className="text-muted-foreground">{t("Tax")}</dt>
          <dd className="tabular-nums">{money(order.taxTotal)}</dd>
        </div>
      )}
      <div className={cn(row, "mt-1.5 border-t border-border pt-2.5 text-lg font-extrabold")}>
        <dt>{t("Total")}</dt>
        <dd className="tabular-nums">{money(order.total)}</dd>
      </div>
      {order.taxTotal > 0 && included && (
        <p className="text-xs text-muted-foreground">
          {t("Includes {amount} tax", { amount: money(order.taxTotal) })}
        </p>
      )}
    </dl>
  );
}

export function AddressBlock({ address }: Readonly<{ address: ShopAddress }>) {
  const cityLine = [address.city, address.region, address.postalCode].filter(Boolean).join(", ");
  return (
    <address className="text-sm leading-relaxed not-italic">
      {address.name && <span className="block font-semibold">{address.name}</span>}
      {address.line1 && <span className="block">{address.line1}</span>}
      {address.line2 && <span className="block">{address.line2}</span>}
      {cityLine && <span className="block">{cityLine}</span>}
      {address.country && <span className="block">{regionName(address.country)}</span>}
      {address.phone && <span className="block text-muted-foreground">{address.phone}</span>}
    </address>
  );
}

/** "US" → "United States", in the reader's language when the browser knows it. */
export function regionName(code: string): string {
  try {
    return new Intl.DisplayNames(undefined, { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
