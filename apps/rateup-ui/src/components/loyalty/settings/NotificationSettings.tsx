import { IconLoader2 } from "@tabler/icons-react";
import { useId } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";

import { useUpdateLoyaltyProgramMutation } from "@/backend/loyalty/program.query";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Switch } from "@/components/ui/switch.tsx";

import type { NotificationsSettingsSchema } from "./schemas.ts";

type NotificationsSettings = z.infer<typeof NotificationsSettingsSchema>;
type NotificationsField = keyof NotificationsSettings;
const NOTIFICATION_FIELDS: readonly NotificationsField[] = [
  "customerNotifications",
  "autoApproveAdjustments",
  "emailNotifications",
  "whatsappNotifications",
  "enableShopifyOrderPoints",
];

interface NotificationSettingsProps {
  form: UseFormReturn<NotificationsSettings>;
  /** `null` until the program exists, which is also when the card is disabled. */
  programId: string | null;
  disabled?: boolean;
}

export function NotificationSettings({
  form,
  programId,
  disabled = false,
}: Readonly<NotificationSettingsProps>) {
  const uid = useId();
  const { t } = useTranslation();

  const programStatus = useUpdateLoyaltyProgramMutation(programId ?? "");
  const notifications = useUpdateLoyaltyProgramMutation(programId ?? "");

  const { dirtyFields } = form.formState;
  const notificationsDirty = NOTIFICATION_FIELDS.some((field) => dirtyFields[field]);

  const commitProgramStatus = async (active: boolean, previous: boolean) => {
    if (!programId) return;
    try {
      await programStatus.mutateAsync({ status: active ? "active" : "paused" });
    } catch {
      form.setValue("programActive", previous);
      return;
    }

    form.resetField("programActive", { defaultValue: active });
  };

  const saveNotifications = async () => {
    if (!programId) return;
    const values = form.getValues();
    try {
      await notifications.mutateAsync({
        pointsActivityAlerts: values.customerNotifications,
        autoApproveAdjustments: values.autoApproveAdjustments,
        emailNotifications: values.emailNotifications,
        whatsappNotifications: values.whatsappNotifications,
        enableShopifyOrderPoints: values.enableShopifyOrderPoints,
      });
    } catch {
      return;
    }
    // Only this card's fields, so the sibling card's unsaved switch stays dirty.
    NOTIFICATION_FIELDS.forEach((field) => form.resetField(field, { defaultValue: values[field] }));
  };

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
                  <FieldLabel htmlFor={`${uid}-field`} className="text-sm font-medium">
                    {t("Program Active")}
                  </FieldLabel>
                  <FieldDescription className="text-xs text-muted-foreground">
                    {t("Enable/disable program")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id={`${uid}-field`}
                  checked={field.value}
                  onCheckedChange={(val) => {
                    const previous = field.value;
                    field.onChange(val);
                    void commitProgramStatus(val, previous);
                  }}
                  disabled={disabled || programStatus.isPending}
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
                  <FieldLabel htmlFor={`${uid}-field-2`} className="text-sm font-medium">
                    {t("Customer Notifications")}
                  </FieldLabel>
                  <FieldDescription className="text-xs text-muted-foreground">
                    {t("Points activity alerts")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id={`${uid}-field-2`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
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
                  <FieldLabel htmlFor={`${uid}-field-3`} className="text-sm font-medium">
                    {t("Auto-approve Adjustments")}
                  </FieldLabel>
                  <FieldDescription className="text-xs text-muted-foreground">
                    {t("Skip approval flow")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id={`${uid}-field-3`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
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
                  <FieldLabel htmlFor={`${uid}-field-4`} className="text-sm font-medium">
                    {t("Email Notifications")}
                  </FieldLabel>
                  <FieldDescription className="text-xs text-muted-foreground">
                    {t("Send via email")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id={`${uid}-field-4`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
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
                  <FieldLabel htmlFor={`${uid}-field-5`} className="text-sm font-medium">
                    {t("WhatsApp Notifications")}
                  </FieldLabel>
                  <FieldDescription className="text-xs text-muted-foreground">
                    {t("Send via WhatsApp")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id={`${uid}-field-5`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
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
                  <FieldLabel htmlFor={`${uid}-field-6`} className="text-sm font-medium">
                    {t("Shopify Product Order Points")}
                  </FieldLabel>
                  <FieldDescription className="text-xs text-muted-foreground">
                    {t("Automatically add points for Shopify paid orders")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id={`${uid}-field-6`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                />
              </Field>
            )}
          />

          <Button
            type="button"
            size="sm"
            className="mt-2"
            onClick={() => void saveNotifications()}
            disabled={disabled || notifications.isPending || !notificationsDirty}
          >
            {notifications.isPending ? (
              <>
                <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("Saving")}
              </>
            ) : (
              t("Save Changes")
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
