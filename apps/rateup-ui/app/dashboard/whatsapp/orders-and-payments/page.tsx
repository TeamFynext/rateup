"use client";

import React, { useEffect, useState } from "react";

import { CreditCard, MapPin, Package, Truck } from "lucide-react";

import { IntegratedApps } from "@/types/enums";
import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import { useConnectedWaCatalog } from "@/backend/whatsapp/catalog/catalog.query";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import AddressFieldsTab from "./components/AddressFieldsTab";
import DeliveryOptionsTab from "./components/DeliveryOptionsTab";
import OrdersTable from "./components/OrdersTable";
import PaymentTab from "./components/PaymentTab";

const TABS = [
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "address", label: "Address Fields", icon: MapPin },
  { id: "delivery", label: "Delivery Options", icon: Truck },
  { id: "orders", label: "Orders", icon: Package },
];

export default function OrdersAndPaymentsPage() {
  const { data: waSettings, isLoading: isLoadingSettings } = useWaSettings();
  const { data: shopifyIntegration, isLoading: isLoadingShopify } =
    useIntegrationByType(IntegratedApps.shopify);

  const [currentSettingId, setCurrentSettingId] = useState<string>("");

  useEffect(() => {
    if (waSettings?.length && !currentSettingId) {
      setCurrentSettingId(waSettings[0].id);
    }
  }, [waSettings, currentSettingId]);

  const currentSetting =
    waSettings?.find((s) => s.id === currentSettingId) ?? waSettings?.[0];

  // Resolve catalogId from connected catalog for this phone number
  const { data: connectedCatalog } = useConnectedWaCatalog(
    currentSetting?.phoneId,
  );
  const catalogId: string = connectedCatalog?.catalogId ?? "";

  const isShopifyConnected = !!(shopifyIntegration?.credential as any)?.session
    ?.shop;

  if (isLoadingSettings || isLoadingShopify) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!currentSetting) {
    return (
      <div className="p-6 text-muted-foreground">
        WhatsApp settings not found. Please set up a WhatsApp account first.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Orders & Payments
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure payment, address collection, and delivery for WhatsApp
            orders
          </p>
        </div>

        {waSettings && waSettings.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Label htmlFor="wa-selector" className="text-sm whitespace-nowrap">
              WhatsApp Number
            </Label>
            <Select
              value={currentSettingId}
              onValueChange={setCurrentSettingId}
            >
              <SelectTrigger id="wa-selector" className="w-[220px]">
                <SelectValue placeholder="Select number" />
              </SelectTrigger>
              <SelectContent>
                {waSettings.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.phoneDisplayName || s.phone || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* No catalog warning */}
      {!catalogId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          ⚠️ No WhatsApp catalog connected to this phone number. Connect a
          catalog first in the <strong>Catalog</strong> section to enable
          address collection and delivery features.
        </div>
      )}

      {/* 4-tab layout */}
      <Tabs defaultValue="payment" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-1.5 text-xs sm:text-sm"
            >
              <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="payment" className="mt-0">
          <PaymentTab
            catalogId={catalogId}
            isShopifyConnected={isShopifyConnected}
          />
        </TabsContent>

        <TabsContent value="address" className="mt-0">
          <AddressFieldsTab catalogId={catalogId} />
        </TabsContent>

        <TabsContent value="delivery" className="mt-0">
          <DeliveryOptionsTab catalogId={catalogId} />
        </TabsContent>

        <TabsContent value="orders" className="mt-0">
          <OrdersTable
            settingId={currentSettingId}
            phoneId={currentSetting?.phoneId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
