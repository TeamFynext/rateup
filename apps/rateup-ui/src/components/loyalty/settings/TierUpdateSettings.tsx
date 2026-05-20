"use client";

import { ArrowUpCircle, Loader2, Save, Send } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { TemplateType } from "@/types/enums.ts";
import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";
import WaTemplateSelector from "@/components/input/WaTemplateSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { FormField } from "@/components/ui/form.tsx";
import { Switch } from "@/components/ui/switch.tsx";

import { getLoyaltyTemplateLabel, LoyaltyTemplateTypes } from "./utils.ts";

interface TierUpdateSettingsProps {
  form: UseFormReturn<any>;
  isPending: boolean;
  onToggle: (eventType: LoyaltyEventType, enabled: boolean) => void;
  onSave: () => void;
  isModified: boolean;
  onModify: () => void;
  disabled?: boolean;
}

export function TierUpdateSettings({
  form,
  isPending,
  onToggle,
  onSave,
  isModified,
  onModify,
  disabled = false,
}: Readonly<TierUpdateSettingsProps>) {
  const { t } = useTranslation();
  const templateInfo = getLoyaltyTemplateLabel(
    LoyaltyTemplateTypes.TierUpgraded,
    t,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowUpCircle className="w-4 h-4 text-primary" />
          {t("Tier Updates")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name={`${LoyaltyEventType.TIER_UPGRADED}.enabled`}
          render={({ field }) => (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">{t("Tier Upgrade")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("Celebrate when customer reaches a new tier")}
                </p>
              </div>
              <Switch
                checked={field.value}
                onCheckedChange={(val) => {
                  if (!disabled) {
                    onToggle(LoyaltyEventType.TIER_UPGRADED, val);
                  }
                }}
                disabled={isPending || disabled}
              />
            </div>
          )}
        />

        {form.watch(`${LoyaltyEventType.TIER_UPGRADED}.enabled`) && (
          <div className="space-y-2">
            <FormField
              control={form.control}
              name={`${LoyaltyEventType.TIER_UPGRADED}.waTemplateId`}
              render={({ field }) => (
                <WaTemplateSelector
                  templateType={TemplateType.LOYALTY}
                  label={templateInfo.templateLabel}
                  description={templateInfo.templateDescription}
                  value={field.value}
                  onChange={(val) => {
                    if (!disabled) {
                      field.onChange(val);
                      onModify();
                    }
                  }}
                  disabled={disabled}
                />
              )}
            />

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Send className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("Preview Message")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    "Congratulations! 🌟 You've reached {"{"}tier_name
                    {"}"} tier! Enjoy exciting new benefits like {"{"}
                    benefits_summary{"}"}."
                  </p>
                </div>
              </div>
            </div>
            {isModified && (
              <Button
                size="sm"
                onClick={onSave}
                disabled={isPending || disabled}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {t("Save Settings")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
