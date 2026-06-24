import { Cake, Info, Loader2, Save } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";
import { useLoyaltyRewards } from "@/backend/loyalty/reward.query";
import WaTemplateSelector from "@/components/input/WaTemplateSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { FormField } from "@/components/ui/form.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { TemplateType } from "@/types/enums.ts";

import { getLoyaltyTemplateLabel, LoyaltyTemplateTypes } from "./utils.ts";

interface BirthdayReminderSettingsProps {
  form: UseFormReturn<any>;
  isPending: boolean;
  onToggle: (eventType: LoyaltyEventType, enabled: boolean) => void;
  onSave: () => void;
  isModified: boolean;
  onModify: () => void;
  disabled?: boolean;
}

export function BirthdayReminderSettings({
  form,
  isPending,
  onToggle,
  onSave,
  isModified,
  onModify,
  disabled = false,
}: Readonly<BirthdayReminderSettingsProps>) {
  const { t } = useTranslation();
  const templateInfo = getLoyaltyTemplateLabel(LoyaltyTemplateTypes.Birthday, t);

  const { data: rewards, isLoading: isLoadingRewards } = useLoyaltyRewards();

  const renderRewardContent = () => {
    if (isLoadingRewards) {
      return (
        <div className="flex items-center justify-center p-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (rewards?.length === 0) {
      return (
        <div className="p-2 text-sm text-center text-muted-foreground">{t("No rewards found")}</div>
      );
    }

    return rewards?.map((reward) => (
      <SelectItem key={reward.id} value={reward.id}>
        {reward.name} {reward.pointsCost > 0 ? `(${reward.pointsCost} pts)` : ""}
      </SelectItem>
    ));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Cake className="w-4 h-4 text-primary" />
          {t("Birthday Reminders")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name={`${LoyaltyEventType.BIRTHDAY}.enabled`}
          render={({ field }) => (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">{t("Enable Birthday Reminders")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("Send birthday wishes with gifts")}
                </p>
              </div>
              <Switch
                checked={field.value}
                onCheckedChange={(val) => {
                  if (!disabled) {
                    onToggle(LoyaltyEventType.BIRTHDAY, val);
                  }
                }}
                disabled={isPending || disabled}
              />
            </div>
          )}
        />

        {form.watch(`${LoyaltyEventType.BIRTHDAY}.enabled`) && (
          <>
            <div className="space-y-2">
              <FormField
                control={form.control}
                name={`${LoyaltyEventType.BIRTHDAY}.rewardId`}
                render={({ field }) => (
                  <>
                    <Label htmlFor="birthday-gift" className="text-sm">
                      {t("Birthday Gift")}
                    </Label>
                    <Select
                      value={field.value}
                      onValueChange={
                        disabled
                          ? undefined
                          : (value) => {
                              field.onChange(value);
                              onModify();
                            }
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger id="birthday-gift" className="h-10">
                        <SelectValue placeholder={t("Select a gift")} />
                      </SelectTrigger>
                      <SelectContent>{renderRewardContent()}</SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t("This gift will be automatically sent on customer's birthday")}
                    </p>
                  </>
                )}
              />
            </div>

            <div className="space-y-2">
              <FormField
                control={form.control}
                name={`${LoyaltyEventType.BIRTHDAY}.waTemplateId`}
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
                <Cake className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{t("Preview Message")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    "Happy Birthday {"{"}
                    customer_name{"}"}! 🎉 We're celebrating with you! Here's a special gift from
                    us: {"{"}
                    gift_name{"}"}. Enjoy your special day! 🎂"
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">{t("How it works:")}</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>{t("Messages are sent automatically on customer's birthday")}</li>
                    <li>{t("Gifts or points are credited to their account")}</li>
                    <li>{t("Customers receive notification via WhatsApp")}</li>
                  </ul>
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
