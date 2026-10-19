import { IconBrandInstagram, IconBrandWhatsapp, IconSearch } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { formatMoney, startStorefrontCheckout, type Storefront } from "@/backend/commerce/shop.api";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty.tsx";
import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";
import { safeHref } from "@/utils/safeHref.ts";

import { addToBag, matchesSearch, resolveBag, setBagQuantity } from "../catalog.ts";
import { StoreAvatar } from "../shared.tsx";
import { lastCheckout, rememberCheckout, useBag } from "../useBag.ts";
import { BagBar } from "./BagBar.tsx";
import { ProductCard } from "./ProductCard.tsx";
import { ProductSheet } from "./ProductSheet.tsx";

interface Props {
  storefront: Storefront;
  productId: string | undefined;
  onProductChange: (productId: string | undefined) => void;
  /** Real addresses on the live storefront, so product links can be crawled and shared. */
  productHref?: (product: Storefront["products"][number]) => string;
  /** The merchant's look before it is live: browsing and the bag work, checkout does not. */
  preview?: boolean;
}

export function StorefrontPage({
  storefront,
  productId,
  onProductChange,
  productHref,
  preview,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { store, collections, products } = storefront;
  const [search, setSearch] = useState("");
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const bag = useBag(store.slug);
  const resolved = useMemo(() => resolveBag(bag.lines, products), [bag.lines, products]);
  const openProduct = products.find((p) => p.id === productId) ?? null;
  const [previewCheckout, setPreviewCheckout] = useState(false);

  const visible = products.filter(
    (p) => matchesSearch(p, search) && (!collectionId || p.collectionIds.includes(collectionId)),
  );

  const checkout = useMutation({
    // The server reuses the bag's last checkout while it is open for exactly these lines.
    mutationFn: () =>
      startStorefrontCheckout(
        store.slug,
        resolved.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        { reuseToken: lastCheckout(store.slug) },
      ),
    onSuccess: (result) => {
      rememberCheckout(store.slug, result.token);
      void navigate({ to: "/c/$token", params: { token: result.token } });
    },
  });

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto w-full max-w-xl pb-44">
        <StoreHero storefront={storefront} />
        <OfferStrip storefront={storefront} />

        <div className="px-4 pt-4 pb-2">
          <label className="relative block">
            <span className="sr-only">{t("Search the shop")}</span>
            <IconSearch className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search products")}
              className="h-11 rounded-full bg-background pl-10"
            />
          </label>
        </div>

        {collections.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 pt-1 pb-3.5 [scrollbar-width:none]">
            {[{ id: null, name: t("All") }, ...collections].map((c) => (
              <Button
                key={c.id ?? "all"}
                type="button"
                size="sm"
                variant={collectionId === c.id ? "default" : "outline"}
                aria-pressed={collectionId === c.id}
                className={cn(
                  "h-8.5 shrink-0 rounded-full px-3.5 font-semibold",
                  collectionId === c.id && "bg-foreground text-background hover:bg-foreground/90",
                )}
                onClick={() => setCollectionId(c.id)}
              >
                {c.name}
              </Button>
            ))}
          </div>
        )}

        {visible.length ? (
          <div className="grid grid-cols-2 gap-x-3.5 gap-y-5 px-4 sm:grid-cols-3">
            {visible.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currency={store.currency}
                href={productHref?.(product)}
                inBag={bag.lines.some((l) => l.productId === product.id)}
                onOpen={() => onProductChange(product.id)}
                onQuickAdd={() =>
                  bag.update((lines) =>
                    addToBag(lines, {
                      productId: product.id,
                      variantId: product.variants[0].id,
                      quantity: 1,
                    }),
                  )
                }
              />
            ))}
          </div>
        ) : (
          <Empty className="mx-4 border border-border">
            <EmptyHeader>
              <EmptyTitle>
                {products.length ? t("Nothing matches that search") : t("No products yet")}
              </EmptyTitle>
              {products.length > 0 && (
                <EmptyDescription>{t("Try another word or collection.")}</EmptyDescription>
              )}
            </EmptyHeader>
          </Empty>
        )}

        <p className="px-4 pt-10 text-center text-xs text-muted-foreground">
          {t("Shop powered by")}{" "}
          <a
            href="https://rateup.app"
            target="_blank"
            rel="noopener"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            RateUp
          </a>
        </p>
      </div>

      <ProductSheet
        slug={store.slug}
        currency={store.currency}
        product={openProduct}
        onClose={() => onProductChange(undefined)}
        onAdd={(line) => bag.update((lines) => addToBag(lines, line))}
      />

      <BagBar
        storeName={store.name}
        currency={store.currency}
        whatsappNumber={store.whatsappNumber}
        lines={resolved.lines}
        count={resolved.count}
        total={resolved.total}
        onQuantity={(variantId, quantity) =>
          bag.update((lines) => setBagQuantity(lines, variantId, quantity))
        }
        onCheckout={() => (preview ? setPreviewCheckout(true) : checkout.mutate())}
        checkingOut={checkout.isPending}
        checkoutError={
          previewCheckout
            ? t("This is a preview. Shoppers can check out once your storefront is on.")
            : checkout.isError
              ? getApiErrorMessage(checkout.error, t("Couldn't start checkout. Try again."))
              : null
        }
      />
    </div>
  );
}

/**
 * The store's name, description and contact links on one card. A banner the merchant set
 * replaces the name and description, and the store's name then sits above it.
 */
function StoreHero({ storefront }: Readonly<{ storefront: Storefront }>) {
  const { t } = useTranslation();
  const { store } = storefront;
  const banner = store.theme?.banner;
  const title = banner?.title || store.name;
  const subtitle = banner?.subtitle || store.description;
  const eyebrow = banner?.eyebrow || (title !== store.name ? store.name : undefined);

  return (
    <header
      className={cn(
        "relative mx-4 mt-4 overflow-hidden rounded-2xl bg-ru-blue-900 text-white",
        banner?.imageUrl && "flex min-h-52 flex-col justify-end sm:min-h-60",
      )}
      style={store.theme?.accent ? { backgroundColor: store.theme.accent } : undefined}
    >
      {banner?.imageUrl && (
        <>
          <img src={banner.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
          {/* Any photo can sit behind the text, so the lower half is darkened to keep it legible. */}
          <span
            aria-hidden
            className="absolute inset-0 bg-linear-to-t from-black/75 via-black/40 to-black/10"
          />
        </>
      )}
      <div className="relative flex flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          {store.logoUrl && (
            <StoreAvatar
              name={store.name}
              logoUrl={store.logoUrl}
              className="size-12 border-white/20"
            />
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-bold tracking-[0.08em] text-white/70 uppercase">
                {eyebrow}
              </p>
            )}
            <h1 className="font-display text-2xl leading-tight font-extrabold">{title}</h1>
          </div>
        </div>
        {subtitle && <p className="text-sm text-white/80">{subtitle}</p>}
        {(store.whatsappNumber || store.instagramUrl) && (
          <div className="flex flex-wrap gap-2">
            {store.whatsappNumber && (
              <a
                href={`https://wa.me/${store.whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9.5 items-center gap-1.5 rounded-full bg-wa-green px-4 text-sm font-bold text-ru-blue-950 transition-opacity hover:opacity-90"
              >
                <IconBrandWhatsapp className="size-4" />
                {t("Chat with us")}
              </a>
            )}
            {safeHref(store.instagramUrl) && (
              <a
                href={safeHref(store.instagramUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9.5 items-center gap-1.5 rounded-full border border-white/30 px-4 text-sm font-semibold transition-colors hover:bg-white/10"
              >
                <IconBrandInstagram className="size-4" />
                {t("Instagram")}
              </a>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function OfferStrip({ storefront }: Readonly<{ storefront: Storefront }>) {
  const { t } = useTranslation();
  const { highlight, currency } = storefront.store;
  if (!highlight) return null;

  let title: string;
  if (highlight.type === "PERCENTAGE" && highlight.value != null) {
    title = t("{value}% off", { value: highlight.value });
  } else if (highlight.type === "FIXED" && highlight.value != null) {
    title = t("{amount} off", { amount: formatMoney(highlight.value, currency) });
  } else if (highlight.type === "FREE_SHIPPING") {
    title = t("Free delivery");
  } else {
    title = t("Special offer");
  }
  const detail = highlight.endsAt
    ? t("Code {code} · ends {date}", {
        code: highlight.code,
        date: dayjs(highlight.endsAt).format("MMM D"),
      })
    : t("Use code {code} at checkout", { code: highlight.code });

  return (
    <p className="mx-4 mt-2 flex flex-wrap items-baseline gap-x-2 rounded-xl bg-ru-amber-50 px-4 py-2.5 text-sm dark:bg-amber-950/40">
      <span className="font-bold text-ru-amber-700 dark:text-amber-500">{title}</span>
      <span className="text-muted-foreground">{detail}</span>
    </p>
  );
}
