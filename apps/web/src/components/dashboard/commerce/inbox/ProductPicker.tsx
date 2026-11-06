import { Button } from "@rateup/ui/components/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@rateup/ui/components/empty";
import { Input } from "@rateup/ui/components/input";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { IconLink, IconPhoto, IconPlus, IconSearch, IconTool } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  formatMoney,
  type ShopProduct,
  type ShopVariant,
  toMoney,
} from "@/backend/commerce/shop.api";
import { useShopCollections, useShopProducts, useShopStore } from "@/backend/commerce/shop.query";
import { QuantityStepper } from "@/components/shop-public/shared.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { cn } from "@/lib/utils.ts";

import { SHOP_PATHS } from "../shop/shopMeta.ts";

export interface PickedLine {
  variant: ShopVariant;
  product: ShopProduct;
  quantity: number;
}

type PickerProps =
  | {
      mode: "products";
      /** Narrows the list to what the channel can show, e.g. products in the WhatsApp catalog. */
      channel?: "whatsapp" | "instagram";
      selected: Pick<ReadonlySet<string>, "has">;
      onToggle: (product: ShopProduct) => void;
      /** Offered on products the catalog can't show, when the storefront can stand in. */
      onSendStorefrontLink?: (product: ShopProduct) => void;
    }
  | {
      mode: "variants";
      lines: ReadonlyMap<string, PickedLine>;
      onLine: (product: ShopProduct, variant: ShopVariant, quantity: number) => void;
    };

export function isSoldOut(variant: ShopVariant): boolean {
  return variant.trackInventory && variant.stock <= 0 && !variant.allowBackorder;
}

export function variantName(variant: ShopVariant): string {
  if (variant.optionValues && Object.keys(variant.optionValues).length) {
    return Object.values(variant.optionValues).join(" / ");
  }
  return variant.title;
}

export function ProductPicker(props: Readonly<PickerProps>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [collectionId, setCollectionId] = useState<string | undefined>();
  const debounced = useDebounce(search.trim(), 300);
  const { data: collections = [] } = useShopCollections();
  const { data, isPending } = useShopProducts({
    status: "ACTIVE",
    sellable: "1",
    search: debounced || undefined,
    collectionId,
    channel: props.mode === "products" ? props.channel : undefined,
    limit: 50,
  });
  const products = data?.items ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <label className="relative block">
        <span className="sr-only">{t("Search products")}</span>
        <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Search products or SKU")}
          className="pl-9"
          autoFocus
        />
      </label>
      {collections.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {[{ id: undefined, name: t("All") }, ...collections].map((c) => (
            <Button
              key={c.id ?? "all"}
              type="button"
              size="xs"
              variant={collectionId === c.id ? "default" : "outline"}
              aria-pressed={collectionId === c.id}
              className="shrink-0 rounded-full px-2.5"
              onClick={() => setCollectionId(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      )}

      <div className="-mx-1 min-h-48 flex-1 overflow-y-auto overscroll-contain px-1">
        {isPending ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <Empty className="p-6">
            <EmptyHeader>
              <EmptyTitle className="text-sm">{t("No products found")}</EmptyTitle>
              <EmptyDescription>
                {props.mode === "products" && props.channel === "whatsapp"
                  ? t("Only active products in your WhatsApp catalog can be sent here.")
                  : t("Try another search, or add products under Commerce.")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {products.map((product) =>
              props.mode === "products" ? (
                <ProductRow
                  key={product.id}
                  product={product}
                  checked={props.selected.has(product.id)}
                  onToggle={() => props.onToggle(product)}
                  showSync={props.channel === "whatsapp"}
                  onSendStorefrontLink={props.onSendStorefrontLink}
                />
              ) : (
                <VariantRows
                  key={product.id}
                  product={product}
                  lines={props.lines}
                  onLine={props.onLine}
                />
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function Thumb({ product }: Readonly<{ product: ShopProduct }>) {
  const image = product.images[0] ?? product.variants[0]?.imageUrl;
  return image ? (
    <img src={image} alt="" className="size-10 shrink-0 rounded-md object-cover" />
  ) : (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <IconPhoto className="size-4" />
    </span>
  );
}

function stockText(variants: ShopVariant[], t: TFunction) {
  const tracked = variants.filter((v) => v.trackInventory);
  if (!tracked.length) return null;
  if (tracked.every(isSoldOut)) return t("Sold out");
  const stock = tracked.reduce((sum, v) => sum + Math.max(v.stock, 0), 0);
  return t("{count} in stock", { count: stock });
}

function ProductRow({
  product,
  checked,
  onToggle,
  showSync,
  onSendStorefrontLink,
}: Readonly<{
  product: ShopProduct;
  checked: boolean;
  onToggle: () => void;
  showSync: boolean;
  onSendStorefrontLink?: (product: ShopProduct) => void;
}>) {
  const { t } = useTranslation();
  const notLive = showSync && product.metaSyncStatus !== "LIVE";
  const meta = [
    product.variants.length > 1
      ? t("{count, plural, one {# variant} other {# variants}}", { count: product.variants.length })
      : null,
    stockText(product.variants, t),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <label
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-lg border border-transparent p-2 transition-colors hover:bg-muted",
          checked && "border-primary/30 bg-primary/5",
        )}
      >
        <Checkbox checked={checked} onCheckedChange={onToggle} />
        <Thumb product={product} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{product.title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {meta}
            {notLive && (
              <span className="text-amber-700 dark:text-amber-500">
                {meta ? " · " : ""}
                {t("Not live in the WhatsApp catalog")}
              </span>
            )}
          </span>
        </span>
        <PriceRange product={product} />
      </label>
      {notLive && (
        <div className="flex flex-wrap gap-1.5 pb-1 pl-22">
          <Button
            type="button"
            size="xs"
            variant="outline"
            render={
              <Link
                to={SHOP_PATHS.product}
                params={{ productId: product.id }}
                target="_blank"
                rel="noopener"
              />
            }
          >
            <IconTool />
            {t("Fix")}
          </Button>
          {onSendStorefrontLink && (
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => onSendStorefrontLink(product)}
            >
              <IconLink />
              {t("Send storefront link instead")}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

function PriceRange({ product }: Readonly<{ product: ShopProduct }>) {
  const currency = useStoreCurrency();
  const prices = product.variants.map((v) => toMoney(v.price));
  if (!prices.length || !currency) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return (
    <span className="shrink-0 text-sm font-semibold tabular-nums">
      {min === max ? formatMoney(min, currency) : `${formatMoney(min, currency)}+`}
    </span>
  );
}

function VariantRows({
  product,
  lines,
  onLine,
}: Readonly<{
  product: ShopProduct;
  lines: ReadonlyMap<string, PickedLine>;
  onLine: (product: ShopProduct, variant: ShopVariant, quantity: number) => void;
}>) {
  const { t } = useTranslation();
  const currency = useStoreCurrency();
  const single = product.variants.length === 1;

  return (
    <li className="rounded-lg border border-border p-2">
      <div className="flex items-center gap-3">
        <Thumb product={product} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{product.title}</span>
      </div>
      <ul className="mt-1.5 flex flex-col">
        {product.variants.map((variant) => {
          const quantity = lines.get(variant.id)?.quantity ?? 0;
          const soldOut = isSoldOut(variant);
          return (
            <li key={variant.id} className="flex min-h-9 items-center gap-2 pl-13">
              <span className="min-w-0 flex-1 truncate text-xs">
                {!single && <span className="font-medium">{variantName(variant)} · </span>}
                <span className="text-muted-foreground">
                  {soldOut
                    ? t("Sold out")
                    : variant.trackInventory
                      ? t("{count} in stock", { count: variant.stock })
                      : t("Not tracked")}
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums">
                {currency && formatMoney(variant.price, currency)}
              </span>
              {quantity > 0 ? (
                <QuantityStepper
                  size="sm"
                  min={0}
                  max={variant.trackInventory && !variant.allowBackorder ? variant.stock : 99}
                  value={quantity}
                  label={product.title}
                  onChange={(value) => onLine(product, variant, value)}
                />
              ) : (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={soldOut}
                  onClick={() => onLine(product, variant, 1)}
                >
                  <IconPlus />
                  {t("Add")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </li>
  );
}

/** Products carry no currency of their own; it is the store's. */
function useStoreCurrency(): string | undefined {
  return useShopStore().data?.currency;
}
