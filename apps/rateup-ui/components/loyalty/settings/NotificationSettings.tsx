"use client";

import { useExtracted } from "next-intl";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

import { NotificationsSettingsSchema } from "./schemas";

interface NotificationSettingsProps {
  form: UseFormReturn<z.infer<typeof NotificationsSettingsSchema>>;
  onSave: (updates: any) => void;
}

export function NotificationSettings({
  form,
  onSave,
}: NotificationSettingsProps) {
  const t = useExtracted();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Notifications")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Form {...form}>
          <form className="space-y-2">
            <FormField
              control={form.control}
              name="programActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between p-2.5 border rounded-lg space-y-0">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">
                      {t("Program Active")}
                    </FormLabel>
                    <FormDescription className="text-xs text-muted-foreground">
                      {t("Enable/disable program")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(val) => {
                        field.onChange(val);
                        onSave({
                          status: val ? "active" : "paused",
                        });
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

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
                        field.onChange(val);
                        onSave({
                          customerNotifications: val,
                        });
                      }}
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
                        field.onChange(val);
                        onSave({
                          autoApproveAdjustments: val,
                        });
                      }}
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
                        field.onChange(val);
                        onSave({
                          emailNotifications: val,
                        });
                      }}
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
                        field.onChange(val);
                        onSave({
                          whatsappNotifications: val,
                        });
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
