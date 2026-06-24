import { AlertTriangle, Info, Loader2, Save } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";
import WaTemplateSelector from "@/components/input/WaTemplateSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { FormField } from "@/components/ui/form.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { TemplateType } from "@/types/enums.ts";

import { getLoyaltyTemplateLabel, LoyaltyTemplateTypes } from "./utils.ts";

interface PointsExpirySettingsProps {
  form: UseFormReturn<any>;
  isPending: boolean;
  onToggle: (eventType: LoyaltyEventType, enabled: boolean) => void;
  onSaveAlert: () => void;
  onSaveExpired: () => void;
  isAlertModified: boolean;
  isExpiredModified: boolean;
  onModifyAlert: () => void;
  onModifyExpired: () => void;
  disabled?: boolean;
}

export function PointsExpirySettings({
  form,
  isPending,
  onToggle,
  onSaveAlert,
  onSaveExpired,
  isAlertModified,
  isExpiredModified,
  onModifyAlert,
  onModifyExpired,
  disabled = false,
}: Readonly<PointsExpirySettingsProps>) {
  const { t } = useTranslation();
  const alertInfo = getLoyaltyTemplateLabel(LoyaltyTemplateTypes.PointsExpiryAlert, t);
  const expiredInfo = getLoyaltyTemplateLabel(LoyaltyTemplateTypes.PointsExpired, t);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-primary" />
          {t("Points Expiry Notifications")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Expiry Alert - 14 days before */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name={`${LoyaltyEventType.POINTS_EXPIRY_ALERT}.enabled`}
            render={({ field }) => (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{t("Enable Expiry Alert")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("Notify customers 14 days before their points expire")}
                  </p>
                </div>
                <Switch
                  checked={field.value}
                  onCheckedChange={(val) => {
                    if (!disabled) {
                      onToggle(LoyaltyEventType.POINTS_EXPIRY_ALERT, val);
                    }
                  }}
                  disabled={isPending || disabled}
                />
              </div>
            )}
          />

          {form.watch(`${LoyaltyEventType.POINTS_EXPIRY_ALERT}.enabled`) && (
            <>
              <FormField
                control={form.control}
                name={`${LoyaltyEventType.POINTS_EXPIRY_ALERT}.waTemplateId`}
                render={({ field }) => (
                  <WaTemplateSelector
                    templateType={TemplateType.LOYALTY}
                    label={alertInfo.templateLabel}
                    description={alertInfo.templateDescription}
                    value={field.value}
                    onChange={(value) => {
                      if (!disabled) {
                        field.onChange(value);
                        onModifyAlert();
                      }
                    }}
                    disabled={disabled}
                  />
                )}
              />

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Sent when customer's last purchase was 11 months and 11 days ago (14 days before expiry)",
                    )}
                  </p>
                </div>
              </div>

              {isAlertModified && (
                <Button size="sm" onClick={onSaveAlert} disabled={isPending || disabled}>
                  {isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {t("Save Settings")}
                </Button>
              )}
            </>
          )}
        </div>

        <div className="border-t pt-4 space-y-4">
          <FormField
            control={form.control}
            name={`${LoyaltyEventType.POINTS_EXPIRED}.enabled`}
            render={({ field }) => (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{t("Enable Points Expired Notification")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("Notify customers when their points have expired")}
                  </p>
                </div>
                <Switch
                  checked={field.value}
                  onCheckedChange={(val) => {
                    if (!disabled) {
                      onToggle(LoyaltyEventType.POINTS_EXPIRED, val);
                    }
                  }}
                  disabled={isPending || disabled}
                />
              </div>
            )}
          />

          {form.watch(`${LoyaltyEventType.POINTS_EXPIRED}.enabled`) && (
            <>
              <FormField
                control={form.control}
                name={`${LoyaltyEventType.POINTS_EXPIRED}.waTemplateId`}
                render={({ field }) => (
                  <WaTemplateSelector
                    templateType={TemplateType.LOYALTY}
                    label={expiredInfo.templateLabel}
                    description={expiredInfo.templateDescription}
                    value={field.value}
                    onChange={(value) => {
                      if (!disabled) {
                        field.onChange(value);
                        onModifyExpired();
                      }
                    }}
                    disabled={disabled}
                  />
                )}
              />

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Sent automatically when points expire after 12 months of no purchase activity",
                    )}
                  </p>
                </div>
              </div>

              {isExpiredModified && (
                <Button size="sm" onClick={onSaveExpired} disabled={isPending || disabled}>
                  {isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {t("Save Settings")}
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
