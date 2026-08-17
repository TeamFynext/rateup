import { IconCheck, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useUpdateLeadMutation } from "@/backend/pipeline/pipeline.query.tsx";
import type { LeadDetail, PipelineLabel } from "@/backend/pipeline/pipeline.types.ts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { LeadLabelChip } from "../shared/atoms.tsx";

interface LeadLabelPickerProps {
  lead: LeadDetail;
  labels: PipelineLabel[];
}

/**
 * The lead's labels, with the pipeline's full set behind the "Add" chip. Each
 * row toggles, so removing a label is the same gesture as adding one.
 */
export function LeadLabelPicker({ lead, labels }: Readonly<LeadLabelPickerProps>) {
  const { t } = useTranslation();
  const updateLead = useUpdateLeadMutation();
  const [open, setOpen] = useState(false);

  const applied = new Set(lead.labels.map((label) => label.id));

  const toggle = (labelId: string) => {
    const next = applied.has(labelId)
      ? lead.labels.filter((label) => label.id !== labelId).map((label) => label.id)
      : [...applied, labelId];
    updateLead.mutate({ leadId: lead.id, input: { labelIds: next } });
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {lead.labels.map((label) => (
        <LeadLabelChip key={label.id} label={label} />
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="border-border text-muted-foreground hover:bg-muted inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-0.5 text-[10px] font-semibold transition-colors"
            >
              <IconPlus className="size-2.5" />
              {t("Add")}
            </button>
          }
        />
        {/* `gap-0`: the popup is a flex column, and its default rem gap would
            space these rows out like paragraphs. */}
        <PopoverContent align="start" className="w-56 gap-0 p-1.5">
          {labels.length === 0 ? (
            <p className="text-muted-foreground p-2 text-xs">
              {t("This pipeline has no labels yet — add them in pipeline settings.")}
            </p>
          ) : (
            labels.map((label) => (
              <button
                key={label.id}
                type="button"
                onClick={() => toggle(label.id)}
                className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  // Label colours are org-chosen hex; no class names them.
                  style={{ backgroundColor: label.color }}
                />
                <span className="flex-1 truncate font-medium">{label.name}</span>
                <IconCheck
                  className={cn("size-3.5 shrink-0", applied.has(label.id) ? "" : "invisible")}
                />
              </button>
            ))
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
