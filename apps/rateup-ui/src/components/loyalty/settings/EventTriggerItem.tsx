import { IconDeviceFloppy, IconLoader2 } from "@tabler/icons-react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";
import WaTemplateSelector from "@/components/input/WaTemplateSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { TemplateType } from "@/types/enums.ts";

import type { EventTriggersFormValues } from "./schemas.ts";
import type { LoyaltyTemplateTypes } from "./utils.ts";
import { getLoyaltyTemplateLabel } from "./utils.ts";

interface EventTriggerItemProps {
  form: UseFormReturn<EventTriggersFormValues>;
  eventType: LoyaltyEventType;
  templateType: LoyaltyTemplateTypes;
  title: string;
  description: string;
  isModified: boolean;
  onModify: () => void;
  onSave: () => void;
  onToggle: (enabled: boolean) => void;
  isPending: boolean;
  disabled?: boolean;
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
  disabled = false,
}: Readonly<EventTriggerItemProps>) {
  const { t } = useTranslation();
  const templateInfo = getLoyaltyTemplateLabel(templateType, t);

  return (
    <div className="border rounded-lg p-4 bg-card hover:bg-muted/20 transition-colors">
      <Controller
        control={form.control}
        name={`${eventType}.enabled`}
        render={({ field }) => (
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-medium text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
            <Switch
              checked={field.value}
              onCheckedChange={(val) => onToggle(val)}
              disabled={disabled}
            />
          </div>
        )}
      />
      {form.watch(`${eventType}.enabled`) && (
        <div className="space-y-3 pt-2 border-t border-border mt-2">
          <Controller
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
                disabled={disabled}
              />
            )}
          />

          {isModified && (
            <Button size="sm" onClick={onSave} disabled={isPending || disabled} className="w-full">
              {isPending ? (
                <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <IconDeviceFloppy className="w-4 h-4 mr-2" />
              )}
              {t("Save")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
