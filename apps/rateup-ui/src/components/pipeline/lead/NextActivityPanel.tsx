import { IconCalendarX } from "@tabler/icons-react";
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useCreateLeadTaskMutation,
  useUpdateLeadTaskMutation,
} from "@/backend/pipeline/pipeline.query.tsx";
import type { LeadDetail, LeadTaskType } from "@/backend/pipeline/pipeline.types.ts";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { TASK_TYPE_ICON } from "../pipeline.constants.tsx";
import { taskTypeLabel } from "../pipeline.labels.ts";
import { isOverdue } from "../pipeline.utils.ts";

const TASK_TYPES: LeadTaskType[] = ["CALL", "MESSAGE", "MEETING", "DOCUMENT", "TODO"];

/** Compact scheduler behind the panel's "Schedule" link. */
function ScheduleForm({ leadId, onDone }: Readonly<{ leadId: string; onDone: () => void }>) {
  const { t } = useTranslation();
  const createTask = useCreateLeadTaskMutation();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<LeadTaskType>("CALL");
  const [dueAt, setDueAt] = useState<Date | undefined>(dayjs().add(1, "day").toDate());

  const submit = () => {
    if (!title.trim()) return;
    createTask.mutate(
      { leadId, input: { title: title.trim(), type, dueAt: dueAt?.toISOString() ?? null } },
      { onSuccess: onDone },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label htmlFor="activity-title">{t("What happens next?")}</Label>
        <Input
          id="activity-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("e.g. Follow up on the quote")}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label className="mb-1.5 block">{t("Type")}</Label>
        <div className="flex flex-wrap gap-1.5">
          {TASK_TYPES.map((candidate) => {
            const TypeIcon = TASK_TYPE_ICON[candidate];
            return (
              <button
                key={candidate}
                type="button"
                onClick={() => setType(candidate)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors",
                  candidate === type
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                <TypeIcon className="size-3" />
                {taskTypeLabel(t, candidate)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block">{t("Due")}</Label>
        <DatePicker value={dueAt} onChange={setDueAt} />
      </div>

      <Button
        size="sm"
        className="self-end"
        onClick={submit}
        disabled={!title.trim() || createTask.isPending}
      >
        {t("Schedule")}
      </Button>
    </div>
  );
}

/**
 * The lead's next step. A lead with nothing scheduled is the one that goes
 * quiet, so that state is drawn as a warning rather than as empty space.
 */
function assigneeSummary(t: TFunction, assignees: LeadDetail["assignees"]): string {
  const [first, ...rest] = assignees;
  const name = first.name ?? t("a teammate");
  return rest.length ? t("{name} +{total}", { name, total: rest.length }) : name;
}

export function NextActivityPanel({ lead }: Readonly<{ lead: LeadDetail }>) {
  const { t } = useTranslation();
  const updateTask = useUpdateLeadTaskMutation();
  const [scheduling, setScheduling] = useState(false);

  const task = lead.nextTask;
  const overdue = isOverdue(lead);
  const ActivityIcon = task ? TASK_TYPE_ICON[task.type] : IconCalendarX;

  const tone = task
    ? overdue
      ? "text-destructive"
      : "text-foreground"
    : "text-amber-700 dark:text-amber-500";

  return (
    <div
      className={cn(
        "mt-5 flex items-center gap-2.5 rounded-xl border p-3.5",
        task ? "border-border" : "border-amber-600/35 bg-amber-50 dark:bg-amber-950/30",
      )}
    >
      <ActivityIcon className={cn("size-4 shrink-0", tone)} />

      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-[13px] font-bold", tone)}>
          {task?.title ?? t("No next activity scheduled")}
        </div>
        <div className="text-muted-foreground mt-0.5 text-[11px]">
          {task
            ? [
                taskTypeLabel(t, task.type),
                task.dueAt ? dayjs(task.dueAt).format("ddd D MMM, h:mm A") : t("No due date"),
                lead.assignees.length
                  ? t("Assigned to {who}", { who: assigneeSummary(t, lead.assignees) })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : t("Leads without a next step stall — schedule one now.")}
        </div>
      </div>

      {task ? (
        <Button
          variant="link"
          size="sm"
          className="h-auto shrink-0 p-0 text-xs font-bold"
          onClick={() => updateTask.mutate({ taskId: task.id, input: { completed: true } })}
          disabled={updateTask.isPending}
        >
          {t("Mark done")}
        </Button>
      ) : (
        <Popover open={scheduling} onOpenChange={setScheduling}>
          <PopoverTrigger
            render={
              <Button variant="link" size="sm" className="h-auto shrink-0 p-0 text-xs font-bold">
                {t("Schedule")}
              </Button>
            }
          />
          <PopoverContent align="end" className="w-80">
            <ScheduleForm leadId={lead.id} onDone={() => setScheduling(false)} />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
