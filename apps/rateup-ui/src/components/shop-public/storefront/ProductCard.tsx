import { IconPhoto } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { formatMoney, type StorefrontProduct } from "@/backend/commerce/shop.api";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

import { priceRange, productBadge } from "../catalog.ts";
import { PriceTag } from "../shared.tsx";

interface Props {
  product: StorefrontProduct;
  currency: string;
  /** The product's own URL; without it (the dashboard preview) the card only opens the sheet. */
  href?: string;
  inBag: boolean;
  onOpen: () => void;
  /** Adds a single-variant product straight to the bag; anything with options opens the sheet. */
  onQuickAdd: () => void;
}

export function ProductCard({
  product,
  currency,
  href,
  inBag,
  onOpen,
  onQuickAdd,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const badge = productBadge(product);
  const { min, max } = priceRange(product);
  const single = product.variants.length === 1 ? product.variants[0] : undefined;
  const soldOut = badge?.kind === "sold_out";
  const image = product.images[0] ?? single?.imageUrl;

  let action = t("Add");
  let actionLabel = t("Add {product}", { product: product.title });
  if (soldOut) {
    action = t("Notify me");
    actionLabel = t("Notify me when {product} is back", { product: product.title });
  } else if (inBag) {
    action = t("Added");
    actionLabel = t("{product} is in your bag", { product: product.title });
  }

  return (
    <article className="flex flex-col gap-1.5">
      <OpenProduct
        href={href}
        onOpen={onOpen}
        className="relative aspect-square overflow-hidden rounded-2xl bg-muted text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={product.title}
      >
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className={cn("size-full object-cover", soldOut && "opacity-60")}
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <IconPhoto className="size-8" />
          </span>
        )}
        {badge && (
          <span
            className={cn(
              "absolute top-2 left-2 rounded-full bg-background px-2 py-0.5 text-[11px] font-bold text-foreground shadow-xs",
              badge.kind === "low_stock" && "text-ru-amber-700",
            )}
          >
            {badge.kind === "sold_out" && t("Sold out")}
            {badge.kind === "low_stock" && t("Low stock")}
            {badge.kind === "options" &&
              t("{count, plural, one {# option} other {# options}}", { count: badge.count })}
          </span>
        )}
      </OpenProduct>
      <OpenProduct
        href={href}
        onOpen={onOpen}
        className="line-clamp-2 text-left text-sm leading-[18px] font-semibold outline-none hover:underline focus-visible:underline"
      >
        {product.title}
      </OpenProduct>
      <div className="flex items-center justify-between gap-2">
        {min === max ? (
          <PriceTag
            price={min}
            compareAt={single?.compareAtPrice}
            currency={currency}
            className="text-sm"
          />
        ) : (
          <span className="text-sm font-bold">
            {t("From {price}", { price: formatMoney(min, currency) })}
          </span>
        )}
        <Button
          type="button"
          size="sm"
          variant={inBag && !soldOut ? "default" : "outline"}
          className={cn(
            "shrink-0 rounded-full px-3 font-bold",
            !(inBag && !soldOut) && "border-primary text-primary",
          )}
          aria-label={actionLabel}
          onClick={single && !soldOut ? onQuickAdd : onOpen}
        >
          {action}
        </Button>
      </div>
    </article>
  );
}

/**
 * A real link when the product has a URL, so it can be crawled and opened in a new tab; a plain
 * click still opens the sheet in place.
 */
function OpenProduct({
  href,
  onOpen,
  className,
  children,
  ...rest
}: Readonly<{
  href: string | undefined;
  onOpen: () => void;
  className: string;
  children: ReactNode;
  "aria-label"?: string;
}>) {
  if (!href) {
    return (
      <button type="button" onClick={onOpen} className={className} {...rest}>
        {children}
      </button>
    );
  }
  return (
    <a
      href={href}
      className={cn("block", className)}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onOpen();
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
