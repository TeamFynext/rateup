import { Clock, Info, Loader2, Save } from "lucide-react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";
import WaTemplateSelector from "@/components/input/WaTemplateSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { TemplateType } from "@/types/enums.ts";

import type { EventTriggersFormValues } from "./schemas.ts";
import { getLoyaltyTemplateLabel, LoyaltyTemplateTypes } from "./utils.ts";

interface PointsReminderSettingsProps {
  form: UseFormReturn<EventTriggersFormValues>;
  isPending: boolean;
  onToggle: (eventType: LoyaltyEventType, enabled: boolean) => void;
  onSave: () => void;
  isModified: boolean;
  onModify: () => void;
  disabled?: boolean;
}

export function PointsReminderSettings({
  form,
  isPending,
  onToggle,
  onSave,
  isModified,
  onModify,
  disabled = false,
}: Readonly<PointsReminderSettingsProps>) {
  const { t } = useTranslation();
  const templateInfo = getLoyaltyTemplateLabel(LoyaltyTemplateTypes.InactivityReminder, t);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          {t("Points Reminder")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Controller
          control={form.control}
          name={`${LoyaltyEventType.INACTIVITY_REMINDER}.enabled`}
          render={({ field }) => (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">{t("Enable Points Reminder")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("Remind customers about their points balance")}
                </p>
              </div>
              <Switch
                checked={field.value}
                onCheckedChange={(val) => {
                  if (!disabled) {
                    onToggle(LoyaltyEventType.INACTIVITY_REMINDER, val);
                  }
                }}
                disabled={isPending || disabled}
              />
            </div>
          )}
        />

        {form.watch(`${LoyaltyEventType.INACTIVITY_REMINDER}.enabled`) && (
          <>
            <Field>
              <Controller
                control={form.control}
                name={`${LoyaltyEventType.INACTIVITY_REMINDER}.triggerDays`}
                render={({ field }) => (
                  <>
                    <FieldLabel htmlFor="reminder-days" className="text-sm">
                      {t("Days of Inactivity")}
                    </FieldLabel>
                    <Input
                      id="reminder-days"
                      type="number"
                      value={field.value}
                      onChange={(e) => {
                        if (!disabled) {
                          field.onChange(e.target.value);
                          onModify();
                        }
                      }}
                      placeholder="30"
                      min="1"
                      className="h-10"
                      disabled={disabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("Send reminder after {days} days of no purchase activity", {
                        days: field.value || "0",
                      })}
                    </p>
                  </>
                )}
              />
            </Field>

            <div className="space-y-2">
              <Controller
                control={form.control}
                name={`${LoyaltyEventType.INACTIVITY_REMINDER}.waTemplateId`}
                render={({ field }) => (
                  <WaTemplateSelector
                    templateType={TemplateType.LOYALTY}
                    label={templateInfo.templateLabel}
                    description={templateInfo.templateDescription}
                    value={field.value}
                    onChange={(value) => {
                      if (!disabled) {
                        field.onChange(value);
                        onModify();
                      }
                    }}
                    disabled={disabled}
                  />
                )}
              />
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{t("Preview Message")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    "Hi {"{"}customer_name{"}"}, you have {"{"}
                    points_balance
                    {"}"} points available! Visit us soon to redeem your rewards. 🎁"
                  </p>
                </div>
              </div>
            </div>

            {isModified && (
              <Button size="sm" onClick={onSave} disabled={isPending || disabled}>
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
      </CardContent>
    </Card>
  );
}
