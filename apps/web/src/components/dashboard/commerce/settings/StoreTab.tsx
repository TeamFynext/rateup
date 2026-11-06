import { Button } from "@rateup/ui/components/button";
import { Input } from "@rateup/ui/components/input";
import { Textarea } from "@rateup/ui/components/textarea";
import { IconDownload, IconExternalLink, IconEye } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { toMoney, type ShopStore, type ShopStoreUpdate } from "@/backend/commerce/shop.api";
import { CurrencySelect } from "@/components/ui/currency-select.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";

import { SettingsSaveBar } from "../shop/SettingsSaveBar.tsx";
import { SHOP_PATHS } from "../shop/shopMeta.ts";
import { SettingRow, ShopSection, ToneBadge } from "../shop/ShopUi.tsx";
import { numOrNull, useStoreSection } from "../shop/useStoreSection.ts";
import { CatalogConnect } from "./CatalogConnect.tsx";
import { CopyButton, ImagePicker } from "./parts.tsx";

function storeDraft(store: ShopStore) {
  const theme = store.storefrontTheme ?? {};
  return {
    name: store.name,
    description: store.description ?? "",
    logoUrl: store.logoUrl ?? "",
    lowStockThreshold: String(store.lowStockThreshold),
    currency: store.currency,
    taxRate: store.taxRate === null ? "" : String(toMoney(store.taxRate)),
    pricesIncludeTax: store.pricesIncludeTax,
    storefrontEnabled: store.storefrontEnabled,
    slug: store.slug,
    bannerTitle: theme.banner?.title ?? "",
    bannerSubtitle: theme.banner?.subtitle ?? "",
    bannerImage: theme.banner?.imageUrl ?? "",
    instagramUrl: theme.instagramUrl ?? "",
  };
}
type StoreDraft = ReturnType<typeof storeDraft>;

function storePatch(store: ShopStore) {
  const theme = store.storefrontTheme ?? {};
  return (d: StoreDraft): ShopStoreUpdate => ({
    name: d.name.trim(),
    description: d.description.trim() || null,
    logoUrl: d.logoUrl || null,
    lowStockThreshold: Number(d.lowStockThreshold) || 0,
    currency: d.currency,
    taxRate: numOrNull(d.taxRate),
    pricesIncludeTax: d.pricesIncludeTax,
    storefrontEnabled: d.storefrontEnabled,
    slug: d.slug.trim(),
    storefrontTheme: {
      ...theme,
      banner:
        d.bannerTitle.trim() || d.bannerSubtitle.trim() || d.bannerImage
          ? {
              ...theme.banner,
              title: d.bannerTitle.trim() || undefined,
              subtitle: d.bannerSubtitle.trim() || undefined,
              imageUrl: d.bannerImage || undefined,
            }
          : null,
      instagramUrl: d.instagramUrl.trim() || null,
    },
  });
}

export function StoreTab({ store }: Readonly<{ store: ShopStore }>) {
  const { t } = useTranslation();
  const { canAny } = usePermissions();
  const canEdit = canAny(["commerce.payments.manage", "commerce.storefront.manage"]);
  const initial = storeDraft(store);
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <ShopSection
        title={t("Meta catalog")}
        description={t(
          "WhatsApp and Instagram show your products from this catalog. Picking one saves straight away.",
        )}
      >
        <CatalogConnect store={store} />
      </ShopSection>
      <fieldset disabled={!canEdit} className="flex min-w-0 flex-col gap-5">
        <StoreForm
          key={JSON.stringify(initial)}
          store={store}
          initial={initial}
          canEdit={canEdit}
        />
      </fieldset>
    </div>
  );
}

function StoreForm({
  store,
  initial,
  canEdit,
}: Readonly<{ store: ShopStore; initial: StoreDraft; canEdit: boolean }>) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const s = useStoreSection(initial, storePatch(store));
  return (
    <>
      <ShopSection title={t("Store")}>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="store-name">{t("Store name")}</FieldLabel>
            <Input
              id="store-name"
              maxLength={80}
              value={s.draft.name}
              onChange={(e) => s.set({ name: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="store-description">{t("Short description")}</FieldLabel>
            <Textarea
              id="store-description"
              rows={2}
              maxLength={500}
              value={s.draft.description}
              onChange={(e) => s.set({ description: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel>{t("Logo")}</FieldLabel>
            <ImagePicker
              url={s.draft.logoUrl}
              onChange={(logoUrl) => s.set({ logoUrl })}
              label={t("Upload logo")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="store-low-stock">{t("Default low-stock alert")}</FieldLabel>
            <Input
              id="store-low-stock"
              className="w-24"
              inputMode="numeric"
              value={s.draft.lowStockThreshold}
              onChange={(e) => s.set({ lowStockThreshold: e.target.value })}
            />
            <span className="text-xs text-muted-foreground">
              {t("Used for variants without their own alert level.")}
            </span>
          </Field>
        </div>
      </ShopSection>

      <ShopSection title={t("Currency and tax")}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="shop-currency">{t("Currency")}</FieldLabel>
            <CurrencySelect
              name="shop-currency"
              value={s.draft.currency}
              onValueChange={(value) => s.set({ currency: value })}
            />
            <span className="text-xs text-muted-foreground">
              {t(
                "Prices, orders and payment links use this currency. New shops start with your loyalty programme's currency, or US dollars.",
              )}
            </span>
          </Field>
          <Field>
            <FieldLabel htmlFor="tax-rate">{t("Tax rate (%)")}</FieldLabel>
            <Input
              id="tax-rate"
              inputMode="decimal"
              className="w-28"
              placeholder="0"
              value={s.draft.taxRate}
              onChange={(e) => s.set({ taxRate: e.target.value })}
            />
          </Field>
        </div>
        <SettingRow
          title={t("Prices include tax")}
          description={t("Tax is shown as its own line on the order either way.")}
          control={
            <Switch
              aria-label={t("Prices include tax")}
              checked={s.draft.pricesIncludeTax}
              onCheckedChange={(v) => s.set({ pricesIncludeTax: v })}
            />
          }
        />
      </ShopSection>

      <fieldset disabled={!can("commerce.storefront.manage")} className="min-w-0">
        <StorefrontSection store={store} draft={s.draft} set={s.set} dirty={s.dirty} />
      </fieldset>

      {canEdit && (
        <SettingsSaveBar
          dirty={s.dirty}
          saving={s.save.isPending}
          onSave={() => s.save.mutate()}
          onDiscard={s.reset}
        />
      )}
    </>
  );
}

function StorefrontSection({
  store,
  draft,
  set,
  dirty,
}: Readonly<{
  store: ShopStore;
  draft: StoreDraft;
  set: (patch: Partial<StoreDraft>) => void;
  dirty: boolean;
}>) {
  const { t } = useTranslation();
  // The server slugifies on save; this shows the URL as it will be.
  const slug = draft.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const url = store.storefrontUrl ? store.storefrontUrl.replace(/[^/]+\/?$/, slug) : "";
  const live = store.storefrontEnabled && !dirty;

  return (
    <ShopSection
      title={t("Storefront")}
      description={t(
        "A link-in-bio shop for Instagram and anywhere else. Buyers check out in WhatsApp or on the page.",
      )}
      actions={
        <span className="flex items-center gap-3">
          <Button size="sm" variant="outline" render={<Link to={SHOP_PATHS.storefrontPreview} />}>
            <IconEye data-icon="inline-start" />
            {t("Preview")}
          </Button>
          <Switch
            aria-label={t("Publish storefront")}
            checked={draft.storefrontEnabled}
            onCheckedChange={(v) => set({ storefrontEnabled: v })}
          />
        </span>
      }
    >
      <div className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="store-slug">{t("Link")}</FieldLabel>
          <Input
            id="store-slug"
            maxLength={40}
            value={draft.slug}
            onChange={(e) => set({ slug: e.target.value })}
          />
          {url && (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              {store.storefrontEnabled ? (
                <ToneBadge tone="ok">{t("Live")}</ToneBadge>
              ) : (
                <ToneBadge tone="mute">{t("Off")}</ToneBadge>
              )}
              <span className="font-mono text-xs break-all text-muted-foreground">{url}</span>
              <CopyButton value={url} label={t("Copy storefront link")} />
              {live && (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {t("Open")}
                  <IconExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
            </span>
          )}
        </Field>
        {live && url && <StorefrontQr url={url} slug={slug} />}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="banner-title">{t("Banner headline")}</FieldLabel>
            <Input
              id="banner-title"
              maxLength={80}
              value={draft.bannerTitle}
              onChange={(e) => set({ bannerTitle: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="banner-subtitle">{t("Banner text")}</FieldLabel>
            <Input
              id="banner-subtitle"
              maxLength={120}
              value={draft.bannerSubtitle}
              onChange={(e) => set({ bannerSubtitle: e.target.value })}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel>{t("Banner image")}</FieldLabel>
          <ImagePicker
            wide
            url={draft.bannerImage}
            onChange={(bannerImage) => set({ bannerImage })}
            label={t("Upload banner")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="store-instagram">{t("Instagram profile")}</FieldLabel>
          <Input
            id="store-instagram"
            type="url"
            placeholder="https://instagram.com/yourshop"
            value={draft.instagramUrl}
            onChange={(e) => set({ instagramUrl: e.target.value })}
          />
        </Field>
      </div>
    </ShopSection>
  );
}

function StorefrontQr({ url, slug }: Readonly<{ url: string; slug: string }>) {
  const { t } = useTranslation();
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 512, margin: 1 })
      .then((dataUrl) => {
        if (!cancelled) setQr(dataUrl);
      })
      .catch(() => setQr(null));
    return () => {
      cancelled = true;
    };
  }, [url]);
  if (!qr) return null;
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg bg-muted/60 p-3">
      <img
        src={qr}
        alt={t("QR code for your storefront")}
        className="size-24 rounded-md bg-background p-1"
      />
      <div className="flex flex-col gap-2 text-sm">
        <span className="text-muted-foreground">
          {t("Print it on packaging, receipts or your counter so shoppers can scan straight in.")}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="w-fit"
          render={<a href={qr} download={`${slug || "shop"}-qr.png`} />}
        >
          <IconDownload data-icon="inline-start" />
          {t("Download QR")}
        </Button>
      </div>
    </div>
  );
}
