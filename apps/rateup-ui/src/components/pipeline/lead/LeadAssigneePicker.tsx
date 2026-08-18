import { IconCheck, IconChevronDown, IconUserOff } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useUpdateLeadMutation } from "@/backend/pipeline/pipeline.query.tsx";
import type { LeadDetail, PipelineUser } from "@/backend/pipeline/pipeline.types.ts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { AssigneeStack } from "../shared/AssigneeStack.tsx";
import { LeadAvatar } from "../shared/LeadAvatar.tsx";

interface LeadAssigneePickerProps {
  lead: LeadDetail;
  members: PipelineUser[];
}

/**
 * Adds and removes the people working a lead. Rows toggle, so taking a lead off
 * someone is the same gesture as putting them on it — there is no separate
 * remove control to hunt for.
 */
export function LeadAssigneePicker({ lead, members }: Readonly<LeadAssigneePickerProps>) {
  const { t } = useTranslation();
  const updateLead = useUpdateLeadMutation();
  const [open, setOpen] = useState(false);

  const assigned = new Set(lead.assignees.map((user) => user.id));

  const toggle = (userId: string) => {
    const next = assigned.has(userId)
      ? lead.assignees.filter((user) => user.id !== userId).map((user) => user.id)
      : [...assigned, userId];
    updateLead.mutate({ leadId: lead.id, input: { assigneeIds: next } });
  };

  const clear = () => {
    setOpen(false);
    if (lead.assignees.length === 0) return;
    updateLead.mutate({ leadId: lead.id, input: { assigneeIds: [] } });
  };

  const summary =
    lead.assignees.length === 1
      ? (lead.assignees[0].name ?? t("Teammate"))
      : t("{total} people", { total: lead.assignees.length });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={updateLead.isPending}
            className="hover:bg-muted -mx-1.5 mt-0.5 flex w-[calc(100%+0.75rem)] items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left transition-colors"
          >
            {lead.assignees.length > 0 ? (
              <AssigneeStack assignees={lead.assignees} size="sm" />
            ) : (
              <IconUserOff className="size-3.5 shrink-0 text-amber-700 dark:text-amber-500" />
            )}
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[13px] font-semibold",
                lead.assignees.length > 0
                  ? "text-foreground"
                  : "text-amber-700 dark:text-amber-500",
              )}
            >
              {lead.assignees.length > 0 ? summary : t("Unassigned")}
            </span>
            <IconChevronDown className="text-muted-foreground size-3 shrink-0" />
          </button>
        }
      />

      {/* `gap-0`: the popup is a flex column that otherwise spaces every row a
          full rem apart, which is what made this list sprawl. */}
      <PopoverContent align="start" className="w-52 gap-0 p-1">
        {members.length === 0 ? (
          <p className="text-muted-foreground p-2 text-[11px]">
            {t("Nobody is on this pipeline's teams yet.")}
          </p>
        ) : (
          <>
            <div className="max-h-56 overflow-y-auto overscroll-contain">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggle(member.id)}
                  className="hover:bg-muted flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1 text-left text-[11px] transition-colors"
                >
                  <LeadAvatar
                    name={member.name}
                    photo={member.profilePhoto}
                    tone="person"
                    colorKey={member.id}
                    size="sm"
                  />
                  <span className="flex-1 truncate">{member.name ?? t("Teammate")}</span>
                  <IconCheck
                    className={cn(
                      "text-primary size-3 shrink-0",
                      assigned.has(member.id) ? "" : "invisible",
                    )}
                  />
                </button>
              ))}
            </div>

            {lead.assignees.length > 0 ? (
              <button
                type="button"
                onClick={clear}
                className="text-muted-foreground hover:bg-muted border-border mt-1 flex w-full items-center gap-1.5 rounded-sm border-t px-1.5 pt-1.5 pb-1 text-left text-[11px] transition-colors"
              >
                <IconUserOff className="size-3 shrink-0" />
                {t("Unassign everyone")}
              </button>
            ) : null}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
