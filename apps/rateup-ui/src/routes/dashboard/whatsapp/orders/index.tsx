import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import OrdersTable from "@/components/dashboard/whatsapp/orders-and-payments/components/OrdersTable";
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

export const Route = createFileRoute("/dashboard/whatsapp/orders/")({
  component: OrdersPage,
});

function OrdersPage() {
  const { data: waSettings, isLoading: isLoadingSettings } = useWaSettings();

  const [currentSettingId, setCurrentSettingId] = useState<string>("");

  useEffect(() => {
    if (waSettings?.length && !currentSettingId) {
      setCurrentSettingId(waSettings[0].id);
    }
  }, [waSettings, currentSettingId]);

  const currentSetting = waSettings?.find((s) => s.id === currentSettingId) ?? waSettings?.[0];

  if (isLoadingSettings) {
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
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View and manage your WhatsApp catalog orders
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
              items={waSettings.map((s) => ({
                value: s.id,
                label: s.phoneDisplayName || s.phone || "Unknown",
              }))}
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

      <Tabs defaultValue="standard" className="w-full space-y-4">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="standard">Standard</TabsTrigger>
          <TabsTrigger value="shopify">Shopify Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="standard" className="space-y-4 outline-none">
          <OrdersTable
            settingId={currentSettingId}
            phoneId={currentSetting?.phoneId}
            storeType="standard"
          />
        </TabsContent>
        <TabsContent value="shopify" className="space-y-4 outline-none">
          <OrdersTable
            settingId={currentSettingId}
            phoneId={currentSetting?.phoneId}
            storeType="shopify"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
