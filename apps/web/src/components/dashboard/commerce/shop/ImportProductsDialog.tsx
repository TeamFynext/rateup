import { Alert, AlertDescription } from "@rateup/ui/components/alert";
import { Button } from "@rateup/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rateup/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rateup/ui/components/select";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { IconBrandMeta, IconFileSpreadsheet, IconUpload } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useRef, useState, type ComponentType, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  getShopImportSources,
  importShopProductsCsv,
  importShopProductsFrom,
  type ShopImportSource,
  type ShopImportSources,
} from "@/backend/commerce/shop.api";
import { useInvalidateShop } from "@/backend/commerce/shop.query";
import { ShopifyLogo, WooCommerceLogo } from "@/components/integrations/logos";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { settingsTab } from "./shopMeta";

interface Outcome {
  created: number;
  updated: number;
  skipped: { product: string; reason: string }[];
  /** Set when the shop now follows the store, and so checks out there. */
  following?: string;
}

const STORES = {
  shopify: { name: "Shopify", mode: "SHOPIFY", logo: ShopifyLogo },
  woocommerce: { name: "WooCommerce", mode: "WOOCOMMERCE", logo: WooCommerceLogo },
} as const;

/** Every way to bring products in, in one place: a Meta catalog, an online store, or a file. */
export function ImportProductsDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const fileRef = useRef<HTMLInputElement>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sources = useQuery({
    queryKey: ["shop", "import-sources"],
    queryFn: getShopImportSources,
    enabled: open,
  });

  const onDone = (result: Outcome) => {
    setError(null);
    setOutcome(result);
    void invalidate();
  };
  const onError = (e: unknown) => setError(getApiErrorMessage(e, t("Could not import products")));
  const fromSource = useMutation({
    mutationFn: importShopProductsFrom,
    onSuccess: (result, input) =>
      onDone({
        ...result,
        following: input.keepInSync
          ? input.source === "shopify"
            ? "Shopify"
            : "WooCommerce"
          : undefined,
      }),
    onError,
  });
  const fromCsv = useMutation({
    mutationFn: async (file: File) => importShopProductsCsv(await file.text()),
    onSuccess: (r) => onDone({ ...r, updated: 0 }),
    onError,
  });
  const pending = fromSource.isPending || fromCsv.isPending;
  const running = (source: ShopImportSource, keepInSync = false) =>
    fromSource.isPending &&
    fromSource.variables?.source === source &&
    Boolean(fromSource.variables.keepInSync) === keepInSync;
  const run = (source: ShopImportSource, keepInSync = false, catalogId?: string) => {
    setError(null);
    fromSource.mutate({ source, keepInSync, catalogId });
  };

  const close = (next: boolean) => {
    if (!next) {
      setOutcome(null);
      setError(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-xl">
        {outcome ? (
          <ImportOutcome outcome={outcome} onClose={() => close(false)} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("Import products")}</DialogTitle>
              <DialogDescription>
                {t("Bring in the products you already sell elsewhere. Nothing is removed there.")}
              </DialogDescription>
            </DialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {sources.isPending ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : sources.data ? (
              <ul className="flex flex-col gap-2">
                <MetaSource
                  sources={sources.data}
                  disabled={pending}
                  loading={running("meta")}
                  onImport={(catalogId) => run("meta", false, catalogId)}
                />
                {(["shopify", "woocommerce"] as const).map((id) => (
                  <StoreSource
                    key={id}
                    id={id}
                    sources={sources.data}
                    disabled={pending}
                    running={running}
                    onImport={run}
                  />
                ))}
                <SourceRow
                  icon={IconFileSpreadsheet}
                  name={t("CSV file")}
                  description={t(
                    "One row per variant, with at least Product and Price columns. Export your products to see the format.",
                  )}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setError(null);
                        fromCsv.mutate(file);
                      }
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    loading={fromCsv.isPending}
                    onClick={() => fileRef.current?.click()}
                  >
                    <IconUpload data-icon="inline-start" />
                    {t("Upload CSV")}
                  </Button>
                </SourceRow>
              </ul>
            ) : (
              <Alert variant="destructive">
                <AlertDescription>
                  {getApiErrorMessage(sources.error, t("Could not load import options"))}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SourceRow({
  icon: Icon,
  name,
  description,
  children,
}: Readonly<{
  icon: ComponentType<{ className?: string }>;
  name: string;
  description: ReactNode;
  children?: ReactNode;
}>) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold">{name}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </div>
      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </li>
  );
}

function storeName(mode: ShopImportSources["mode"]) {
  return mode === "SHOPIFY" ? "Shopify" : "WooCommerce";
}

function MetaSource({
  sources,
  disabled,
  loading,
  onImport,
}: Readonly<{
  sources: ShopImportSources;
  disabled: boolean;
  loading: boolean;
  onImport: (catalogId: string) => void;
}>) {
  const { t } = useTranslation();
  const name = t("Meta catalog");
  const [from, setFrom] = useState(sources.meta.catalogId ?? "");
  if (sources.mode !== "NATIVE") {
    return (
      <SourceRow
        icon={IconBrandMeta}
        name={name}
        description={t(
          "Your products come from {store}, which already fills your catalog. Sync {store} instead.",
          { store: storeName(sources.mode) },
        )}
      />
    );
  }
  if (!sources.meta.catalogId) {
    return (
      <SourceRow
        icon={IconBrandMeta}
        name={name}
        description={t("Connect the catalog you use on WhatsApp first.")}
      >
        <Button variant="outline" size="sm" render={<Link {...settingsTab("store")} />}>
          {t("Connect catalog")}
        </Button>
      </SourceRow>
    );
  }
  return (
    <SourceRow
      icon={IconBrandMeta}
      name={name}
      description={<MetaCatalogChoice sources={sources} value={from} onChange={setFrom} />}
    >
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        loading={loading}
        onClick={() => onImport(from)}
      >
        {t("Import")}
      </Button>
    </SourceRow>
  );
}

/**
 * Picking a catalog only chooses where products are read from. The connected catalog stays
 * connected, so products copied from another one are published to it, never back.
 */
function MetaCatalogChoice({
  sources,
  value,
  onChange,
}: Readonly<{ sources: ShopImportSources; value: string; onChange: (id: string) => void }>) {
  const { t } = useTranslation();
  const { catalogs, catalogId: connectedId } = sources.meta;
  const label = (id: string) => catalogs.find((c) => c.catalogId === id)?.name || id;
  const connected = label(connectedId ?? value);
  const items = catalogs.map((c) => ({
    value: c.catalogId,
    label:
      c.catalogId === connectedId
        ? t("{catalog} (connected)", { catalog: c.name || c.catalogId })
        : c.name || c.catalogId,
  }));
  if (catalogs.length < 2) {
    return t(
      "Copy the products in {catalog} into RateUp. From then on you edit them here, and changes go back to the catalog.",
      { catalog: connected },
    );
  }
  return (
    <span className="flex flex-col gap-2">
      <Select value={value} onValueChange={(id) => id && onChange(id)} items={items}>
        <SelectTrigger className="w-full sm:w-72" aria-label={t("Catalog to import from")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>
        {value === connectedId
          ? t(
              "Copy the products in {catalog} into RateUp. From then on you edit them here, and changes go back to the catalog.",
              { catalog: connected },
            )
          : t(
              "Products are copied into RateUp and added to {connected}, the catalog your store uses. {catalog} itself isn't changed or connected.",
              { connected, catalog: label(value) },
            )}
      </span>
    </span>
  );
}

function StoreSource({
  id,
  sources,
  disabled,
  running,
  onImport,
}: Readonly<{
  id: keyof typeof STORES;
  sources: ShopImportSources;
  disabled: boolean;
  running: (source: ShopImportSource, keepInSync?: boolean) => boolean;
  onImport: (source: ShopImportSource, keepInSync?: boolean) => void;
}>) {
  const { t } = useTranslation();
  const { name, mode, logo } = STORES[id];

  if (!sources[id].connected) {
    return (
      <SourceRow
        icon={logo}
        name={name}
        description={t("Connect your {store} store to bring its products in.", { store: name })}
      >
        <Button
          variant="outline"
          size="sm"
          render={<Link to="/dashboard/settings/integrations/$id" params={{ id }} />}
        >
          {t("Connect {store}", { store: name })}
        </Button>
      </SourceRow>
    );
  }
  if (sources.mode === mode) {
    return (
      <SourceRow
        icon={logo}
        name={name}
        description={t(
          "Your products follow {store}. Sync to pick up new products and price changes.",
          { store: name },
        )}
      >
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          loading={running(id, true)}
          onClick={() => onImport(id, true)}
        >
          {t("Sync now")}
        </Button>
      </SourceRow>
    );
  }
  if (sources.mode !== "NATIVE") {
    return (
      <SourceRow
        icon={logo}
        name={name}
        description={t("Your products already follow {store}.", {
          store: storeName(sources.mode),
        })}
      />
    );
  }
  const canFollow = sources.ownProducts === 0;
  return (
    <SourceRow
      icon={logo}
      name={name}
      description={
        canFollow
          ? t(
              "Copy the products once and edit them here, or keep them in sync so {store} stays where you edit them. Kept in sync, customers check out on your {store} checkout; you can change that in Settings → Checkout.",
              { store: name },
            )
          : t("Copy the products once; from then on you edit them here.")
      }
    >
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        loading={running(id)}
        onClick={() => onImport(id)}
      >
        {t("Copy once")}
      </Button>
      {canFollow && (
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          loading={running(id, true)}
          onClick={() => onImport(id, true)}
        >
          {t("Keep in sync")}
        </Button>
      )}
    </SourceRow>
  );
}

function ImportOutcome({ outcome, onClose }: Readonly<{ outcome: Outcome; onClose: () => void }>) {
  const { t } = useTranslation();
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("Import finished")}</DialogTitle>
        <DialogDescription>
          {outcome.updated > 0
            ? t("{created} new, {updated} updated", {
                created: outcome.created,
                updated: outcome.updated,
              })
            : t("{count, plural, one {# product added} other {# products added}}", {
                count: outcome.created,
              })}
        </DialogDescription>
      </DialogHeader>
      {outcome.skipped.length > 0 && (
        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto overscroll-contain">
          <span className="text-sm font-semibold">
            {t("{count, plural, one {# skipped} other {# skipped}}", {
              count: outcome.skipped.length,
            })}
          </span>
          <ul className="flex flex-col gap-1 text-sm">
            {outcome.skipped.map((s, i) => (
              <li key={`${s.product}-${i}`} className="text-muted-foreground">
                <span className="font-medium text-foreground">{s.product}</span> · {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      {outcome.following && (
        <p className="text-sm text-muted-foreground">
          {t(
            "Your products now stay in sync with {store}, and customers check out on your {store} checkout.",
            { store: outcome.following },
          )}
        </p>
      )}
      <DialogFooter>
        {outcome.following && (
          <Button
            variant="outline"
            render={<Link {...settingsTab("checkout")} onClick={onClose} />}
          >
            {t("Checkout settings")}
          </Button>
        )}
        <Button onClick={onClose}>{t("Done")}</Button>
      </DialogFooter>
    </>
  );
}
