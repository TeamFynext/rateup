"use client";

import { useEffect, useState } from "react";

import { useTranslations } from "next-intl";

import {
  useUpdateWaSettingsMutation,
  useWaSettings,
} from "@/backend/whatsapp/settings/waSettings.query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function PaymentsPage() {
  const { data: waSettingsData, isLoading } = useWaSettings();
  const waSettings = waSettingsData?.[0];
  const updateMutation = useUpdateWaSettingsMutation(waSettings?.id);
  const [value, setValue] = useState(waSettings?.paymentMethod || "NATIVE");
  const translations = useTranslations();

  useEffect(() => {
    if (waSettings?.paymentMethod) {
      setValue(waSettings.paymentMethod);
    }
  }, [waSettings?.paymentMethod]);

  const handleChange = (val) => {
    setValue(val);
    updateMutation.mutate({ paymentMethod: val });
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>{translations("Payment Configuration")}</CardTitle>
          <CardDescription>
            {translations(
              "Select how you want to process payments on WhatsApp",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label>{translations("Payment Method")}</Label>
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="native"
                  name="paymentMethod"
                  value="NATIVE"
                  checked={value === "NATIVE"}
                  onChange={(e) => handleChange(e.target.value)}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="native">
                  {translations("WhatsApp Native Payments")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="shopify"
                  name="paymentMethod"
                  value="SHOPIFY_LINK"
                  checked={value === "SHOPIFY_LINK"}
                  onChange={(e) => handleChange(e.target.value)}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="shopify">
                  {translations("Shopify Auto Checkout")}
                </Label>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              {value === "NATIVE"
                ? translations(
                    "Users will pay directly within WhatsApp using your configured payment gateway.",
                  )
                : translations(
                    "Users will be redirected to a pre-filled Shopify checkout page to complete their purchase.",
                  )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
