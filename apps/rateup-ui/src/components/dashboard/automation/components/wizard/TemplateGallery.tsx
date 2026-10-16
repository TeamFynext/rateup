import { IconCircleCheckFilled } from "@tabler/icons-react";
import { useState } from "react";

import { useIntegrationByType } from "@/backend/appsIntegration/integration.query";
import { useWooStatus } from "@/backend/appsIntegration/woocommerce/woocommerce.query";
import { useChannels } from "@/backend/channels/channels.query";
import type {
  AutomationTemplate,
  TemplateCategory,
  TemplateRequirement,
} from "@/components/dashboard/automation/automation-templates.ts";
import {
  AUTOMATION_TEMPLATES,
  TEMPLATE_CATEGORIES,
} from "@/components/dashboard/automation/automation-templates.ts";
import { cn } from "@/lib/utils.ts";
import { IntegratedApps } from "@/types/enums.ts";

const REQUIREMENT_LABEL: Record<TemplateRequirement, string> = {
  shopify: "Needs Shopify",
  woocommerce: "Needs WooCommerce",
  instagram: "Needs Instagram",
};

/** Which of a template's integrations are not connected yet. */
function useMissingRequirements(): (requirement?: TemplateRequirement) => boolean {
  const { data: shopify } = useIntegrationByType(IntegratedApps.shopify);
  const { data: woo } = useWooStatus();
  const { data: channels } = useChannels();
  const connected: Record<TemplateRequirement, boolean> = {
    shopify: Boolean(shopify?.credential?.session?.shop),
    woocommerce: Boolean(woo?.connected),
    instagram: Boolean(channels?.some((channel) => channel.platform === "INSTAGRAM")),
  };
  return (requirement) => Boolean(requirement && !connected[requirement]);
}

export function TemplateGallery({
  selectedId,
  onPick,
  limit,
  filterable = false,
}: Readonly<{
  selectedId?: string;
  onPick: (template: AutomationTemplate) => void;
  /** Shows only the first few, for surfaces that are not the wizard. */
  limit?: number;
  /** Category chips above the grid. */
  filterable?: boolean;
}>) {
  const isMissing = useMissingRequirements();
  const [category, setCategory] = useState<TemplateCategory | "all">("all");
  const inCategory = AUTOMATION_TEMPLATES.filter(
    (template) => category === "all" || template.category === category,
  );
  const templates = limit ? inCategory.slice(0, limit) : inCategory;
  const chips = [
    { value: "all" as const, label: "All", count: AUTOMATION_TEMPLATES.length },
    ...TEMPLATE_CATEGORIES.map((option) => ({
      ...option,
      count: AUTOMATION_TEMPLATES.filter((template) => template.category === option.value).length,
    })).filter((option) => option.count > 0),
  ];

  return (
    <div className="flex flex-col gap-4">
      {filterable && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter templates">
          {chips.map((chip) => {
            const on = chip.value === category;
            return (
              <button
                key={chip.value}
                type="button"
                aria-pressed={on}
                onClick={() => setCategory(chip.value)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors outline-none",
                  "focus-visible:ring-ring focus-visible:ring-2",
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {chip.label}
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    on ? "text-primary/70" : "text-muted-foreground/70",
                  )}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((template) => {
          const selected = template.id === selectedId;
          const missing = isMissing(template.requires);
          return (
            <button
              key={template.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onPick(template)}
              className={cn(
                "bg-card ring-foreground/10 flex flex-col gap-1.5 rounded-xl p-4 text-left ring-1 transition-shadow",
                "hover:shadow-md focus-visible:ring-ring outline-none focus-visible:ring-2",
                selected && "ring-primary ring-[1.5px]",
              )}
            >
              <span className="flex items-center gap-2">
                <span className="font-display text-[14.5px] font-semibold">{template.name}</span>
                {selected && (
                  <IconCircleCheckFilled className="text-primary ml-auto size-4" aria-hidden />
                )}
              </span>
              <span className="text-muted-foreground text-[13px] leading-normal text-pretty">
                {template.sentence}
              </span>
              {missing && template.requires && (
                <span className="text-xs text-amber-700 dark:text-amber-500">
                  {REQUIREMENT_LABEL[template.requires]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
