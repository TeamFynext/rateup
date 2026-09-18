import { IconClock, IconPlus } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useCreateBusinessHour,
  useDeleteBusinessHour,
  useGetAllBusinessHours,
  useUpdateBusinessHour,
} from "@/backend/org/business-hours/business-hours.query";
import { useRules } from "@/backend/whatsapp/rule/rule.query";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

import type { DependentRule } from "./ScheduleCard.tsx";
import { ScheduleCard } from "./ScheduleCard.tsx";
import type { BusinessHoursFormValues } from "./schema.ts";
import { buildDefaultSchedule } from "./schema.ts";

interface Props {
  canManage: boolean;
}

const DEFAULT_TIMEZONE = "Asia/Kolkata";

export function BusinessHoursSection({ canManage }: Readonly<Props>) {
  const { t } = useTranslation();

  const { data: businessHours, isLoading } = useGetAllBusinessHours();
  // Rules are read only to attribute each schedule. A failure here must not take the
  // section down, so an error simply means no attribution is shown.
  const { data: rules } = useRules();

  const createMutation = useCreateBusinessHour();
  const updateMutation = useUpdateBusinessHour();
  const deleteMutation = useDeleteBusinessHour();

  const [draftOpen, setDraftOpen] = useState(false);

  const list = useMemo(() => businessHours ?? [], [businessHours]);

  /** schedule id -> the rules that gate themselves on it. */
  const rulesBySchedule = useMemo(() => {
    const map = new Map<string, DependentRule[]>();
    for (const rule of rules ?? []) {
      const options = rule.options;
      if (!options?.businessHours?.enabled) continue;

      const scheduleId = options.businessHours.businessHoursId;
      if (!scheduleId) continue;

      map.set(scheduleId, [...(map.get(scheduleId) ?? []), { id: rule.id, name: rule.name }]);
    }
    return map;
  }, [rules]);

  const newSchedule: BusinessHoursFormValues = {
    // Named up front so a first schedule is not blocked behind a required field.
    name: list.length === 0 ? t("Main hours") : t("New schedule"),
    timezone: list[0]?.timezone ?? DEFAULT_TIMEZONE,
    channels: [],
    description: "",
    schedule: buildDefaultSchedule(),
  };

  const handleCreate = async (values: BusinessHoursFormValues) => {
    await createMutation.mutateAsync(values);
    setDraftOpen(false);
  };

  if (isLoading) {
    return (
      <Card id="business-hours" className="p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
        <Skeleton className="h-44 w-full" />
      </Card>
    );
  }

  return (
    // Anchored: the setup guide's business-hours step deep-links to this section.
    <div id="business-hours" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <IconClock className="size-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-display text-base font-medium">{t("Business hours")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("When a person answers. Outside these hours, your auto-replies take over.")}
            </p>
          </div>
        </div>

        {canManage && list.length > 0 && !draftOpen && (
          <Button variant="outline" size="sm" onClick={() => setDraftOpen(true)}>
            <IconPlus className="size-4" />
            {t("Add schedule")}
          </Button>
        )}
      </div>

      {list.map((businessHour) => (
        <ScheduleCard
          key={businessHour.id}
          value={{
            name: businessHour.name,
            timezone: businessHour.timezone,
            // Both are nullable on the wire; the form works in "" and [].
            channels: businessHour.channels ?? [],
            description: businessHour.description ?? "",
            schedule: businessHour.schedule as BusinessHoursFormValues["schedule"],
          }}
          canManage={canManage}
          // The last schedule stays put: rules point at it by id, and there is no
          // way to re-point them from here.
          canDelete={canManage && list.length > 1}
          dependentRules={rulesBySchedule.get(businessHour.id) ?? []}
          isSaving={updateMutation.isPending || deleteMutation.isPending}
          onSave={async (values) => {
            await updateMutation.mutateAsync({ id: businessHour.id, data: values });
          }}
          onDelete={() => deleteMutation.mutate(businessHour.id)}
        />
      ))}

      {draftOpen && (
        <ScheduleCard
          value={newSchedule}
          canManage={canManage}
          canDelete={false}
          dependentRules={[]}
          isSaving={createMutation.isPending}
          onSave={handleCreate}
          isDraft
          onDiscardDraft={() => setDraftOpen(false)}
        />
      )}

      {list.length === 0 && !draftOpen && (
        <Card className="items-center p-8 text-center">
          <IconClock className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">{t("Mon-Fri, 9:00-17:30. Looks right?")}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {t(
              "Start from a standard week and change what does not fit. Automation rules can then hold replies until someone is around.",
            )}
          </p>
          {canManage && (
            <Button className="mt-1" onClick={() => setDraftOpen(true)}>
              {t("Set up business hours")}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
