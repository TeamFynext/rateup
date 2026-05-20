"use client";

import React, { useEffect, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { IntegratedApps } from "@/types/enums.ts";
import {
  useIntegrationByType,
  useWaPaymentConfigurations,
} from "@/backend/appsIntegration/integration.query";
import {
  useUpdateWaSettingsMutation,
  useWaSettings,
} from "@/backend/whatsapp/settings/waSettings.query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Label } from "@/components/ui/label.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

import OrdersTable from "../../../../components/dashboard/whatsapp/orders-and-payments/components/OrdersTable.tsx";

export const Route = createFileRoute(
  "/dashboard/whatsapp/orders-and-payments/",
)({
  component: OrdersAndPaymentsPage,
});

function OrdersAndPaymentsPage() {
  const queryClient = useQueryClient();
  const { data: waSettings, isLoading: isLoadingSettings } = useWaSettings();

  const [currentSettingId, setCurrentSettingId] = useState<string>("");

  useEffect(() => {
    if (waSettings && waSettings.length > 0 && !currentSettingId) {
      setCurrentSettingId(waSettings[0].id);
    }
  }, [waSettings, currentSettingId]);

  const currentSetting =
    waSettings?.find((s) => s.id === currentSettingId) || waSettings?.[0];

  const { mutateAsync: updateWaSettings } =
    useUpdateWaSettingsMutation(currentSettingId);

  const { data: waPaymentConfig, isLoading: isLoadingWaPayment } =
    useWaPaymentConfigurations(currentSettingId);
  const { data: shopifyIntegration, isLoading: isLoadingShopify } =
    useIntegrationByType(IntegratedApps.shopify);

  const [paymentMethod, setPaymentMethod] = useState<string>("NATIVE");

  useEffect(() => {
    if (currentSetting?.paymentMethod) {
      setPaymentMethod(currentSetting.paymentMethod);
    } else {
      setPaymentMethod("NATIVE");
    }
  }, [currentSetting]);

  const handlePaymentMethodChange = async (value: string) => {
    setPaymentMethod(value);
    if (currentSettingId) {
      try {
        await updateWaSettings({
          paymentMethod: value,
        });
        toast.success("Payment method updated successfully");
        queryClient.invalidateQueries({ queryKey: ["waSettings"] });
      } catch (error) {
        toast.error("Failed to update payment method");
        // Revert on error
        setPaymentMethod(currentSetting?.paymentMethod || "NATIVE");
      }
    }
  };

  // waPaymentConfig is the full Integration DB row; its `credential` is a flat
  // array of payment_configuration objects returned from the Meta API.
  // Each item has a `status` field that can be "ACTIVE" when fully configured.
  const paymentCredentials = Array.isArray(waPaymentConfig?.credential)
    ? waPaymentConfig.credential
    : Array.isArray(waPaymentConfig)
      ? waPaymentConfig
      : [];
  const isNativeAvailable = paymentCredentials.some(
    (c: any) => c.status?.toLowerCase() === "active",
  );

  const isShopifyAvailable =
    shopifyIntegration &&
    shopifyIntegration.credential &&
    shopifyIntegration.credential.session?.shop;

  if (isLoadingSettings || isLoadingWaPayment || isLoadingShopify) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!currentSetting) {
    return <div className="p-6">WhatsApp settings not found.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Orders and Payments
        </h1>

        {waSettings && waSettings.length > 0 && (
          <div className="flex items-center space-x-2">
            <Label htmlFor="wa-selector">WhatsApp Number</Label>
            <Select
              value={currentSettingId}
              onValueChange={setCurrentSettingId}
            >
              <SelectTrigger id="wa-selector" className="w-[250px]">
                <SelectValue placeholder="Select a WhatsApp number" />
              </SelectTrigger>
              <SelectContent>
                {waSettings.map((setting) => (
                  <SelectItem key={setting.id} value={setting.id}>
                    {setting.phoneDisplayName ||
                      setting.phone ||
                      "Unknown Number"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={paymentMethod}
            onValueChange={handlePaymentMethodChange}
            className="space-y-4"
          >
            <div
              className={`flex items-start space-x-3 space-y-0 rounded-md border p-4 ${!isNativeAvailable ? "opacity-50" : ""}`}
            >
              <RadioGroupItem
                value="NATIVE"
                id="native"
                disabled={!isNativeAvailable}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="native"
                  className="font-medium text-lg cursor-pointer"
                >
                  WhatsApp Native Payments
                </Label>
                <p className="text-sm text-muted-foreground">
                  Accept payments directly within WhatsApp using supported
                  gateways (Razorpay, PayU, etc.).
                  {!isNativeAvailable && (
                    <span className="block text-red-500 mt-1">
                      (Requires active payment configuration in WhatsApp
                      Manager)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div
              className={`flex items-start space-x-3 space-y-0 rounded-md border p-4 ${!isShopifyAvailable ? "opacity-50" : ""}`}
            >
              <RadioGroupItem
                value="SHOPIFY_LINK"
                id="shopify"
                disabled={!isShopifyAvailable}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="shopify"
                  className="font-medium text-lg cursor-pointer"
                >
                  Shopify Auto Checkout
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically generate Shopify checkout links for orders.
                  {!isShopifyAvailable && (
                    <span className="block text-red-500 mt-1">
                      (Requires active Shopify integration)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {/* We pass the catalogId from settings if available, though currently settings might exist without catalog linked in a strict 1:1 way, usually it's derived.
              However, the requirement implies listing orders. I'll need to fetch catalog ID first or use a hook that handles it. 
              The backend catalog service `getWaCatalogsByOrg` or similar might represent the catalog.
              Let's assume we can get the catalog connected to this setting. 
          */}
          <OrdersTable />
        </CardContent>
      </Card>
    </div>
  );
}
