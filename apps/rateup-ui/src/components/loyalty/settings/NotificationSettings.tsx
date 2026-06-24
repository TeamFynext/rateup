import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form.tsx";
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
          <Form {...form}>
            <form className="space-y-2">
              <FormField
                control={form.control}
                name="programActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-2.5 border rounded-lg space-y-0">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">{t("Program Active")}</FormLabel>
                      <FormDescription className="text-xs text-muted-foreground">
                        {t("Enable/disable program")}
                      </FormDescription>
                    </div>
                    <FormControl>
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
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Notifications")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Form {...form}>
            <form className="space-y-2">
              <FormField
                control={form.control}
                name="customerNotifications"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-2.5 border rounded-lg space-y-0">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        {t("Customer Notifications")}
                      </FormLabel>
                      <FormDescription className="text-xs text-muted-foreground">
                        {t("Points activity alerts")}
                      </FormDescription>
                    </div>
                    <FormControl>
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
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="autoApproveAdjustments"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-2.5 border rounded-lg space-y-0">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        {t("Auto-approve Adjustments")}
                      </FormLabel>
                      <FormDescription className="text-xs text-muted-foreground">
                        {t("Skip approval flow")}
                      </FormDescription>
                    </div>
                    <FormControl>
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
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emailNotifications"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-2.5 border rounded-lg space-y-0">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        {t("Email Notifications")}
                      </FormLabel>
                      <FormDescription className="text-xs text-muted-foreground">
                        {t("Send via email")}
                      </FormDescription>
                    </div>
                    <FormControl>
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
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="whatsappNotifications"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-2.5 border rounded-lg space-y-0">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        {t("WhatsApp Notifications")}
                      </FormLabel>
                      <FormDescription className="text-xs text-muted-foreground">
                        {t("Send via WhatsApp")}
                      </FormDescription>
                    </div>
                    <FormControl>
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
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enableShopifyOrderPoints"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between p-2.5 border rounded-lg space-y-0">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        {t("Shopify Product Order Points")}
                      </FormLabel>
                      <FormDescription className="text-xs text-muted-foreground">
                        {t("Automatically add points for Shopify paid orders")}
                      </FormDescription>
                    </div>
                    <FormControl>
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
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
