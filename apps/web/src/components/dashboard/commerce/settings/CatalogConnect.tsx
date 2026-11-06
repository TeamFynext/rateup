import { Alert, AlertDescription, AlertTitle } from "@rateup/ui/components/alert";
import { Button } from "@rateup/ui/components/button";
import { IconAlertTriangle, IconExternalLink, IconSearch } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  findShopCatalogs,
  updateShopStore,
  type FoundCatalogs,
  type ShopStore,
} from "@/backend/commerce/shop.api";
import { useInvalidateShop } from "@/backend/commerce/shop.query";
import { useCan } from "@/hooks/usePermission.ts";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import { SHOP_PATHS } from "../shop/shopMeta.ts";
import { ToneBadge } from "../shop/ShopUi.tsx";

const COMMERCE_MANAGER_URL = "https://business.facebook.com/commerce";

/** WhatsApp's status, and the "you need this first" note with a link to connect it. */
export function WhatsappStatus({ store }: Readonly<{ store: ShopStore }>) {
  const { t } = useTranslation();
  const canConnect = useCan("channels.manage");
  const wa = store.whatsapp;
  if (wa?.connected) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <ToneBadge tone="ok">{t("WhatsApp connected")}</ToneBadge>
        <span className="text-muted-foreground">
          {wa.numbers
            .map((n) => n.phone)
            .filter(Boolean)
            .join(", ")}
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-muted-foreground">
        {t(
          "Customers shop and pay in your WhatsApp chat, and your products are published to the catalog linked to your WhatsApp Business number. Connect that number first; it takes a few minutes with your Meta account.",
        )}
      </p>
      {canConnect ? (
        <Button
          className="w-fit"
          render={<Link to={SHOP_PATHS.connectWhatsapp} params={{ channel: "whatsapp" }} />}
        >
          {t("Connect WhatsApp")}
        </Button>
      ) : (
        <p className="text-muted-foreground">{t("Ask an admin of your account to connect it.")}</p>
      )}
    </div>
  );
}

type CatalogRow = { catalogId: string; name: string | null; connectedToWhatsapp?: boolean };

/**
 * Finds the merchant's Meta catalogs and connects one. Connecting links it to WhatsApp and
 * republishes every product server-side, so the pick saves immediately.
 */
export function CatalogConnect({ store }: Readonly<{ store: ShopStore }>) {
  const { t } = useTranslation();
  const invalidate = useInvalidateShop();
  const canManage = useCan("commerce.payments.manage");
  const [found, setFound] = useState<FoundCatalogs | null>(null);

  const find = useMutation({
    mutationFn: findShopCatalogs,
    onSuccess: (result) => {
      setFound(result);
      if (result.selected && result.selected !== store.metaCatalogId) {
        toast.success(t("Catalog connected. Your products are being published to it now."));
      }
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not reach Meta. Try again."))),
  });
  const pick = useMutation({
    mutationFn: (catalogId: string) => updateShopStore({ metaCatalogId: catalogId }),
    onSuccess: (_, catalogId) => {
      // WhatsApp has one catalog at a time: the picked one is now it.
      setFound((f) =>
        f
          ? {
              ...f,
              selected: catalogId,
              catalogs: f.catalogs.map((c) => ({
                ...c,
                connectedToWhatsapp: c.catalogId === catalogId,
              })),
            }
          : f,
      );
      toast.success(t("Catalog connected. Your products are being published to it now."));
      void invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, t("Could not connect the catalog"))),
  });

  if (!store.whatsapp?.connected) return <WhatsappStatus store={store} />;

  const rows: CatalogRow[] = found?.catalogs ?? store.catalogs ?? [];
  const selected = found?.selected ?? store.metaCatalogId;
  const searched = found !== null;

  return (
    <div className="flex flex-col gap-3">
      {found && found.warnings.length > 0 && (
        <Alert>
          <IconAlertTriangle aria-hidden />
          <AlertTitle>{t("Meta said")}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {found.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {rows.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {rows.map((c) => {
            const inUse = c.catalogId === selected;
            return (
              <li
                key={c.catalogId}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3",
                  inUse && "border-primary/40 bg-primary/5",
                )}
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-sm font-semibold">{c.name || c.catalogId}</span>
                  <span className="flex flex-wrap gap-1.5">
                    {inUse && <ToneBadge tone="info">{t("Used by your shop")}</ToneBadge>}
                    {c.connectedToWhatsapp && (
                      <ToneBadge tone="ok">{t("Connected to WhatsApp")}</ToneBadge>
                    )}
                  </span>
                </span>
                {/* The shop's catalog only sends product cards while it is the one on WhatsApp. */}
                {(!inUse || !c.connectedToWhatsapp) && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canManage || pick.isPending}
                    loading={pick.isPending && pick.variables === c.catalogId}
                    onClick={() => pick.mutate(c.catalogId)}
                  >
                    {inUse ? t("Connect to WhatsApp") : t("Use this catalog")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      ) : searched ? (
        <div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-4 text-sm">
          <span className="font-semibold">{t("No catalog on your Meta account yet")}</span>
          <span className="text-muted-foreground">
            {t(
              "Create a catalog in Meta Commerce Manager (about 5 minutes), then come back and find it here. RateUp fills it with your products.",
            )}
          </span>
          <a
            href={COMMERCE_MANAGER_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1 font-semibold text-primary hover:underline"
          >
            {t("Open Meta Commerce Manager")}
            <IconExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t(
            "RateUp publishes your products to a Meta catalog, which WhatsApp and Instagram show to customers. Find the catalogs on your Meta account to pick one.",
          )}
        </p>
      )}

      {selected && (
        <p className="text-sm text-muted-foreground">
          {t("Products you add or change are published to this catalog automatically.")}
        </p>
      )}

      <Button
        variant={rows.length > 0 ? "outline" : "default"}
        className="w-fit"
        loading={find.isPending}
        disabled={!canManage}
        onClick={() => find.mutate()}
      >
        <IconSearch data-icon="inline-start" />
        {searched ? t("Find my catalogs again") : t("Find my catalogs")}
      </Button>
    </div>
  );
}
