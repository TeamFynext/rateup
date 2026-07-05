import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Switch } from "@/components/ui/switch.tsx";

import type { NotificationsSettingsSchema } from "./schemas.ts";

interface NotificationSettingsProps {
  form: UseFormReturn<z.infer<typeof NotificationsSettingsSchema>>;
  onSave: (updates: any) => void;
  disabled?: boolean;
}

export function NotificationSettings({
  form,
  onSave,
  disabled = false,
}: Readonly<NotificationSettingsProps>) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Program Status")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            control={form.control}
            name="programActive"
            render={({ field }) => (
              <Field orientation="horizontal" className="p-2.5 border rounded-lg">
                <FieldContent>
                  <FieldLabel className="text-sm font-medium">{t("Program Active")}</FieldLabel>
                  <FieldDescription className="text-xs text-muted-foreground">
                    {t("Enable/disable program")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  checked={field.value}
                  onCheckedChange={(val) => {
                    if (!disabled) {
                      field.onChange(val);
                      onSave({
                        status: val ? "active" : "paused",
                      });
                    }
                  }}
                  disabled={disabled}
                />
              </Field>
            )}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Notifications")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Controller
            control={form.control}
            name="customerNotifications"
            render={({ field }) => (
              <Field orientation="horizontal" className="p-2.5 border rounded-lg">
                <FieldContent>
                  <FieldLabel className="text-sm font-medium">
                    {t("Customer Notifications")}
                  </FieldLabel>
                  <FieldDescription className="text-xs text-muted-foreground">
                    {t("Points activity alerts")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  checked={field.value}
                  onCheckedChange={(val) => {
                    if (!disabled) {
                      field.onChange(val);
                      onSave({
                        customerNotifications: val,
                      });
                    }
                  }}
                  disabled={disabled}
                />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="autoApproveAdjustments"
            render={({ field }) => (
              <Field orientation="horizontal" className="p-2.5 border rounded-lg">
                <FieldContent>
                  <FieldLabel className="text-sm font-medium">
                    {t("Auto-approve Adjustments")}
                  </FieldLabel>
                  <FieldDescription className="text-xs text-muted-foreground">
                    {t("Skip approval flow")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  checked={field.value}
                  onCheckedChange={(val) => {
                    if (!disabled) {
                      field.onChange(val);
                      onSave({
                        autoApproveAdjustments: val,
                      });
                    }
                  }}
                  disabled={disabled}
                />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="emailNotifications"
            render={({ field }) => (
              <Field orientation="horizontal" className="p-2.5 border rounded-lg">
                <FieldContent>
                  <FieldLabel className="text-sm font-medium">
                    {t("Email Notifications")}
                  </FieldLabel>
                  <FieldDescription className="text-xs text-muted-foreground">
                    {t("Send via email")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  checked={field.value}
                  onCheckedChange={(val) => {
                    if (!disabled) {
                      field.onChange(val);
                      onSave({
                        emailNotifications: val,
                      });
                    }
                  }}
                  disabled={disabled}
                />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="whatsappNotifications"
            render={({ field }) => (
              <Field orientation="horizontal" className="p-2.5 border rounded-lg">
                <FieldContent>
                  <FieldLabel className="text-sm font-medium">
                    {t("WhatsApp Notifications")}
                  </FieldLabel>
                  <FieldDescription className="text-xs text-muted-foreground">
                    {t("Send via WhatsApp")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  checked={field.value}
                  onCheckedChange={(val) => {
                    if (!disabled) {
                      field.onChange(val);
                      onSave({
                        whatsappNotifications: val,
                      });
                    }
                  }}
                  disabled={disabled}
                />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="enableShopifyOrderPoints"
            render={({ field }) => (
              <Field orientation="horizontal" className="p-2.5 border rounded-lg">
                <FieldContent>
                  <FieldLabel className="text-sm font-medium">
                    {t("Shopify Product Order Points")}
                  </FieldLabel>
                  <FieldDescription className="text-xs text-muted-foreground">
                    {t("Automatically add points for Shopify paid orders")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  checked={field.value}
                  onCheckedChange={(val) => {
                    if (!disabled) {
                      field.onChange(val);
                      onSave({
                        enableShopifyOrderPoints: val,
                      });
                    }
                  }}
                  disabled={disabled}
                />
              </Field>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
