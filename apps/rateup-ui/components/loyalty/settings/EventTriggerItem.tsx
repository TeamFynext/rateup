"use client";

import { Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { UseFormReturn } from "react-hook-form";

import { TemplateType } from "@/types/enums";
import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";
import WaTemplateSelector from "@/components/input/WaTemplateSelector";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

import { getLoyaltyTemplateLabel, LoyaltyTemplateTypes } from "./utils";

interface EventTriggerItemProps {
  form: UseFormReturn<any>;
  eventType: LoyaltyEventType;
  templateType: LoyaltyTemplateTypes;
  title: string;
  description: string;
  isModified: boolean;
  onModify: () => void;
  onSave: () => void;
  onToggle: (enabled: boolean) => void;
  isPending: boolean;
}

export function EventTriggerItem({
  form,
  eventType,
  templateType,
  title,
  description,
  isModified,
  onModify,
  onSave,
  onToggle,
  isPending,
}: EventTriggerItemProps) {
  const t = useTranslations();
  const templateInfo = getLoyaltyTemplateLabel(templateType, t);

  return (
    <div className="border rounded-lg p-4 bg-card hover:bg-muted/20 transition-colors">
      <FormField
        control={form.control}
        name={`${eventType}.enabled`}
        render={({ field }) => (
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-medium text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            </div>
            <Switch
              checked={field.value}
              onCheckedChange={(val) => onToggle(val)}
            />
          </div>
        )}
      />

      {form.watch(`${eventType}.enabled`) && (
        <div className="space-y-3 pt-2 border-t border-border mt-2">
          <FormField
            control={form.control}
            name={`${eventType}.waTemplateId`}
            render={({ field }) => (
              <WaTemplateSelector
                templateType={TemplateType.LOYALTY}
                label={templateInfo.templateLabel}
                description={templateInfo.templateDescription}
                value={field.value}
                onChange={(val) => {
                  field.onChange(val);
                  onModify();
                }}
              />
            )}
          />

          {isModified && (
            <Button
              size="sm"
              onClick={onSave}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {t("Save")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
