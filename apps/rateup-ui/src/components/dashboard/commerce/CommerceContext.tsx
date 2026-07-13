import { createContext, use, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import { useConnectedWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { IntegratedApps } from "@/types/enums";

type CommerceContextValue = {
  waSettings: any[];
  isLoadingSettings: boolean;
  selectedSettingId: string;
  setSelectedSettingId: (id: string) => void;
  currentSetting: any | undefined;
  phoneId: string | undefined;
  catalogId: string;
  isCatalogConnected: boolean;
  isShopifyConnected: boolean;
  currencySymbol: string;
};

const CommerceContext = createContext<CommerceContextValue | null>(null);

export function CommerceProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { data: waSettings, isLoading: isLoadingSettings } = useWaSettings();
  const { data: shopifyIntegration } = useIntegrationByType(IntegratedApps.shopify);

  const [selectedSettingId, setSelectedSettingId] = useState<string>("");

  useEffect(() => {
    if (waSettings?.length && !selectedSettingId) {
      setSelectedSettingId(waSettings[0].id);
    }
  }, [waSettings, selectedSettingId]);

  const currentSetting = waSettings?.find((s) => s.id === selectedSettingId) ?? waSettings?.[0];
  const phoneId: string | undefined = currentSetting?.phoneId;

  const { data: connectedCatalog } = useConnectedWaCatalog(phoneId);
  const catalogId: string = connectedCatalog?.catalogId ?? "";

  const value = useMemo<CommerceContextValue>(
    () => ({
      waSettings: waSettings ?? [],
      isLoadingSettings,
      selectedSettingId,
      setSelectedSettingId,
      currentSetting,
      phoneId,
      catalogId,
      isCatalogConnected: !!catalogId,
      isShopifyConnected: !!shopifyIntegration?.credential?.session?.shop,
      currencySymbol: "₹",
    }),
    [
      waSettings,
      isLoadingSettings,
      selectedSettingId,
      currentSetting,
      phoneId,
      catalogId,
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
