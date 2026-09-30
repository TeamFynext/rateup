import { IconCalendarX, IconPlus, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useCreateLeadTaskMutation,
  useDeleteLeadTaskMutation,
  useUpdateLeadTaskMutation,
} from "@/backend/pipeline/pipeline.query.tsx";
import type { LeadDetail, LeadTask, LeadTaskType } from "@/backend/pipeline/pipeline.types.ts";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { cn } from "@/lib/utils";

import { TASK_TYPE_ICON } from "../pipeline.constants.tsx";
import { taskTypeLabel } from "../pipeline.labels.ts";
import { FieldLabel } from "../shared/atoms.tsx";
import { submitOnEnter } from "../shared/submitOnEnter.ts";

const TASK_TYPES: LeadTaskType[] = ["CALL", "MESSAGE", "MEETING", "DOCUMENT", "TODO"];

/** Compact scheduler behind the panel's "Schedule" link. */
function ScheduleForm({ leadId, onDone }: Readonly<{ leadId: string; onDone: () => void }>) {
  const { t } = useTranslation();
  const createTask = useCreateLeadTaskMutation();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<LeadTaskType>("CALL");
  const [dueAt, setDueAt] = useState<Date | undefined>(dayjs().add(1, "day").toDate());

  const submit = () => {
    if (!title.trim() || createTask.isPending) return;
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
          onKeyDown={submitOnEnter(submit)}
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

function assigneeSummary(t: TFunction, assignees: LeadDetail["assignees"]): string {
  const [first, ...rest] = assignees;
  const name = first.name ?? t("a teammate");
  return rest.length ? t("{name} +{total}", { name, total: rest.length }) : name;
}

function TaskRow({ task, lead }: Readonly<{ task: LeadTask; lead: LeadDetail }>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const updateTask = useUpdateLeadTaskMutation();
  const deleteTask = useDeleteLeadTaskMutation();

  const overdue = Boolean(task.dueAt && dayjs(task.dueAt).isBefore(dayjs()));
  const TypeIcon = TASK_TYPE_ICON[task.type];
  const tone = overdue ? "text-destructive" : "text-foreground";

  const remove = async () => {
    const ok = await confirm({
      title: t("Remove {title}?", { title: task.title }),
      confirmText: t("Remove"),
    });
    if (ok) deleteTask.mutate(task.id);
  };

  return (
    <div className="border-border flex items-center gap-2.5 border-t px-3.5 py-3 first:border-t-0">
      <TypeIcon className={cn("size-4 shrink-0", tone)} />
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-[13px] font-bold", tone)}>{task.title}</div>
        <div className="text-muted-foreground mt-0.5 truncate text-[11px]">
          {[
            taskTypeLabel(t, task.type),
            task.dueAt ? dayjs(task.dueAt).format("ddd D MMM, h:mm A") : t("No due date"),
            lead.assignees.length
              ? t("Assigned to {who}", { who: assigneeSummary(t, lead.assignees) })
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      <Button
        variant="link"
        size="sm"
        className="h-auto shrink-0 p-0 text-xs font-bold"
        onClick={() => updateTask.mutate({ taskId: task.id, input: { completed: true } })}
        loading={updateTask.isPending}
      >
        {t("Mark done")}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive size-7 shrink-0"
        onClick={() => void remove()}
        disabled={deleteTask.isPending}
        aria-label={t("Remove activity")}
      >
        <IconTrash className="size-3.5" />
      </Button>
    </div>
  );
}

/**
 * The lead's open activities, soonest first. A lead with none is the one that
 * goes quiet, so that state is drawn as a warning rather than as empty space.
 */
export function NextActivityPanel({ lead }: Readonly<{ lead: LeadDetail }>) {
  const { t } = useTranslation();
  const [scheduling, setScheduling] = useState(false);
  const tasks = lead.openTasks;

  const schedule = (
    <Popover open={scheduling} onOpenChange={setScheduling}>
      <PopoverTrigger
        render={
          <Button variant="link" size="sm" className="h-auto shrink-0 gap-1 p-0 text-xs font-bold">
            {tasks.length ? <IconPlus className="size-3.5" /> : null}
            {t("Schedule")}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80">
        <ScheduleForm leadId={lead.id} onDone={() => setScheduling(false)} />
      </PopoverContent>
    </Popover>
  );

  if (tasks.length === 0) {
    return (
      <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-amber-600/35 bg-amber-50 p-3.5 dark:bg-amber-950/30">
        <IconCalendarX className="size-4 shrink-0 text-amber-700 dark:text-amber-500" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold text-amber-700 dark:text-amber-500">
            {t("No next activity scheduled")}
          </div>
          <div className="text-muted-foreground mt-0.5 text-[11px]">
            {t("Leads without a next step stall — schedule one now.")}
          </div>
        </div>
        {schedule}
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <FieldLabel>{t("Next activities ({total})", { total: tasks.length })}</FieldLabel>
        {schedule}
      </div>
      <div className="border-border bg-background rounded-xl border">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} lead={lead} />
        ))}
      </div>
    </div>
  );
}
