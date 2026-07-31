import dayjs from "dayjs";
import { createContext, use, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import type { CommerceFilter } from "@/backend/commerce/commerce.api";
import { useAllWaCatalogs, useConnectedWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { IntegratedApps } from "@/types/enums";

export type CommerceDateRange = { key: string; range: Date[] };

type CommerceContextValue = {
  waSettings: unknown[];
  isLoadingSettings: boolean;
  selectedSettingId: string;
  setSelectedSettingId: (id: string) => void;
  currentSetting: unknown | undefined;
  phoneId: string | undefined;

  /** All catalogs the org has synced from Meta. */
  catalogs: unknown[];
  /** The catalog currently being viewed — the store's connected one unless overridden. */
  catalogId: string;
  setCatalogId: (id: string) => void;
  /** The catalog actually linked to the selected store, if any. */
  connectedCatalogId: string;
  isCatalogConnected: boolean;

  /** Date window shared by every commerce page. */
  dateRange: CommerceDateRange;
  setDateRange: (range: CommerceDateRange) => void;
  /** Date + channel, ready to hand to any commerce query or export. */
  filter: CommerceFilter;

  isShopifyConnected: boolean;
  currencySymbol: string;
};

const CommerceContext = createContext<CommerceContextValue | null>(null);

export function CommerceProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { data: waSettings, isLoading: isLoadingSettings } = useWaSettings();
  const { data: shopifyIntegration } = useIntegrationByType(IntegratedApps.shopify);
  const { data: catalogs } = useAllWaCatalogs();

  const [selectedSettingId, setSelectedSettingId] = useState<string>("");
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>("");
  const [dateRange, setDateRange] = useState<CommerceDateRange>({
    key: "last30days",
    range: [dayjs().subtract(30, "day").startOf("day").toDate(), new Date()],
  });

  useEffect(() => {
    if (waSettings?.length && !selectedSettingId) {
      setSelectedSettingId(waSettings[0].id);
    }
  }, [waSettings, selectedSettingId]);

  const currentSetting = waSettings?.find((s) => s.id === selectedSettingId) ?? waSettings?.[0];
  const phoneId: string | undefined = currentSetting?.phoneId;

  const { data: connectedCatalog } = useConnectedWaCatalog(phoneId);
  const connectedCatalogId: string = connectedCatalog?.catalogId ?? "";

  // Default to the store's connected catalog, and follow it when the store changes —
  // unless the user has explicitly picked a different catalog that still exists.
  useEffect(() => {
    setSelectedCatalogId("");
  }, [selectedSettingId]);

  const catalogList: unknown[] = catalogs ?? [];
  const selectionIsValid =
    !!selectedCatalogId && catalogList.some((c) => c.catalogId === selectedCatalogId);
  const catalogId = selectionIsValid ? selectedCatalogId : connectedCatalogId;

  const value = useMemo<CommerceContextValue>(
    () => ({
      waSettings: waSettings ?? [],
      isLoadingSettings,
      selectedSettingId,
      setSelectedSettingId,
      currentSetting,
      phoneId,

      catalogs: catalogList,
      catalogId,
      setCatalogId: setSelectedCatalogId,
      connectedCatalogId,
      isCatalogConnected: !!catalogId,

      dateRange,
      setDateRange,
      filter: {
        from: dateRange.range[0],
        to: dateRange.range[1],
        // Scope to the viewed catalog; without one the API falls back to all channels.
        catalogId: catalogId || undefined,
      },

      isShopifyConnected: !!shopifyIntegration?.credential?.session?.shop,
      currencySymbol: "₹",
    }),
    [
      waSettings,
      isLoadingSettings,
      selectedSettingId,
      currentSetting,
      phoneId,
      catalogList,
      catalogId,
      connectedCatalogId,
      dateRange,
      shopifyIntegration,
    ],
  );

  return <CommerceContext value={value}>{children}</CommerceContext>;
}

export function useCommerce() {
  const ctx = use(CommerceContext);
  if (!ctx) {
    throw new Error("useCommerce must be used within a CommerceProvider");
  }
  return ctx;
}
