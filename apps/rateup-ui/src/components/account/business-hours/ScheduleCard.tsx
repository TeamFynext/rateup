import { IconPencil, IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import TimeZoneSelector from "@/components/common/time-zone-selector.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";
import { cn } from "@/lib/utils.ts";

import { getOpenState } from "./openState.ts";
import type { BusinessHoursFormValues, DayKey, Schedule } from "./schema.ts";
import { businessHoursFormSchema, days, weekOpenMinutes } from "./schema.ts";
import { TimeField } from "./TimeField.tsx";
import { WeekStrip } from "./WeekStrip.tsx";

/** Rules that named this schedule, for the attribution line. */
export interface DependentRule {
  id: string;
  name: string;
}

interface Props {
  value: BusinessHoursFormValues;
  canManage: boolean;
  canDelete: boolean;
  dependentRules: DependentRule[];
  isSaving: boolean;
  onSave: (values: BusinessHoursFormValues) => Promise<void>;
  onDelete?: () => void;
  /** Set for a card that is not persisted yet, so it opens in an editable state. */
  isDraft?: boolean;
  onDiscardDraft?: () => void;
}

const WEEKDAYS: DayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

/** A stable serialization of the parts a save actually sends, for dirty comparison. */
const serializeSchedule = (values: BusinessHoursFormValues) =>
  JSON.stringify([
    values.name,
    values.timezone,
    values.description ?? "",
    [...(values.channels ?? [])].sort(),
    days.map((day) => [
      day,
      values.schedule[day]?.isOpen ?? false,
      (values.schedule[day]?.timeSlots ?? []).map((slot) => [slot.openTime, slot.closeTime]),
    ]),
  ]);

export function ScheduleCard({
  value,
  canManage,
  canDelete,
  dependentRules,
  isSaving,
  onSave,
  onDelete,
  isDraft = false,
  onDiscardDraft,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();

  const [draft, setDraft] = useState<BusinessHoursFormValues>(value);
  const [openDay, setOpenDay] = useState<DayKey | null>(null);
  // A saved schedule opens as an overview; a draft has nothing to read yet, so it opens
  // in the editor.
  const [isEditing, setIsEditing] = useState(isDraft);

  // Key order and null-vs-"" differ between what the API returns and what the form
  // builds, so a raw JSON compare would leave a freshly saved card stuck on "dirty".
  const isDirty = isDraft || serializeSchedule(draft) !== serializeSchedule(value);

  const dayName = (day: DayKey) =>
    ({
      sunday: t("Sunday"),
      monday: t("Monday"),
      tuesday: t("Tuesday"),
      wednesday: t("Wednesday"),
      thursday: t("Thursday"),
      friday: t("Friday"),
      saturday: t("Saturday"),
    })[day];

  const dayShort = (day: DayKey) => dayName(day).slice(0, 3);

  const describeDay = (day: DayKey) => {
    const daySchedule = draft.schedule[day];
    if (!daySchedule.isOpen) return `${dayName(day)}: ${t("Closed")}`;
    const slots = daySchedule.timeSlots
      .map((slot) => `${slot.openTime}–${slot.closeTime}`)
      .join(", ");
    return `${dayName(day)}: ${slots}`;
  };

  /**
   * Validation runs against the same zod schema the form used, but the issues are mapped
   * back onto the day they belong to so an overlap is reported on the offending row
   * rather than as one message at the foot of the card.
   */
  const { errorsByDay, nameError, isValid } = useMemo(() => {
    const result = businessHoursFormSchema.safeParse(draft);
    if (result.success) {
      return { errorsByDay: {} as Partial<Record<DayKey, string[]>>, nameError: "", isValid: true };
    }

    const byDay: Partial<Record<DayKey, string[]>> = {};
    let name = "";

    for (const issue of result.error.issues) {
      if (issue.path[0] === "name") {
        name = issue.message;
        continue;
      }
      if (issue.path[0] === "schedule") {
        const day = issue.path[1];
        if (typeof day === "string" && days.includes(day as DayKey)) {
          const key = day as DayKey;
          byDay[key] = [...(byDay[key] ?? []), issue.message];
        }
      }
    }

    return { errorsByDay: byDay, nameError: name, isValid: false };
  }, [draft]);

  const openState = useMemo(
    () => getOpenState(draft.schedule, draft.timezone),
    [draft.schedule, draft.timezone],
  );

  const weeklyHours = Math.round((weekOpenMinutes(draft.schedule) / 60) * 10) / 10;

  /** Consecutive days that keep the same hours, collapsed into one line each. */
  const weekSummary = useMemo(() => {
    const rows: { days: DayKey[]; hours: string }[] = [];

    for (const day of days) {
      const daySchedule = draft.schedule[day];
      const hours = daySchedule.isOpen
        ? daySchedule.timeSlots.map((slot) => `${slot.openTime} – ${slot.closeTime}`).join(", ")
        : "";

      const previous = rows.at(-1);
      if (previous && previous.hours === hours) previous.days.push(day);
      else rows.push({ days: [day], hours });
    }

    return rows;
  }, [draft.schedule]);

  const patchSchedule = (next: Schedule) => setDraft((prev) => ({ ...prev, schedule: next }));

  const setDay = (day: DayKey, updater: (current: Schedule[DayKey]) => Schedule[DayKey]) =>
    patchSchedule({ ...draft.schedule, [day]: updater(draft.schedule[day]) });

  const applyTo = (source: DayKey, targets: DayKey[]) => {
    const next = { ...draft.schedule };
    for (const target of targets) {
      if (target === source) continue;
      next[target] = structuredClone(draft.schedule[source]);
    }
    patchSchedule(next);
  };

  const handleDelete = async () => {
    const warning =
      dependentRules.length > 0
        ? ` ${t("It is used by {count} automation rule(s), which will stop checking hours.", {
            count: dependentRules.length,
          })}`
        : "";

    const confirmed = await confirm({
      title: t("Delete schedule"),
      description: `${t("Delete")} "${draft.name}"?${warning} ${t("This action cannot be undone")}`,
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
    });

    if (confirmed) onDelete?.();
  };

  const handleSave = async () => {
    await onSave(draft);
    // A draft card is replaced by the saved one; an existing card returns to its overview.
    setOpenDay(null);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (isDraft) {
      onDiscardDraft?.();
      return;
    }
    setDraft(value);
    setOpenDay(null);
    setIsEditing(false);
  };

  return (
    <Card className="p-5">
      {/* Header: what this schedule is, and what it is currently doing. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          {canManage && isEditing ? (
            <Input
              value={draft.name}
              aria-label={t("Schedule name")}
              aria-invalid={!!nameError}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              className={cn(
                "h-8 max-w-64 border-transparent bg-transparent px-1 font-medium shadow-none hover:border-border focus-visible:border-input",
                nameError && "border-destructive",
              )}
            />
          ) : (
            <p className="px-1 font-medium">{draft.name}</p>
          )}

          {nameError && <p className="px-1 text-xs text-destructive">{nameError}</p>}

          <div className="flex flex-wrap items-center gap-2 px-1">
            {openState.isOpen ? (
              <Badge className="border-transparent bg-green-600/10 text-green-700 dark:text-green-500">
                {t("Open now")}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                {t("Closed now")}
              </Badge>
            )}

            <span className="text-xs text-muted-foreground tabular-nums">
              {openState.isOpen && openState.nextTime
                ? t("Until {time}", { time: openState.nextTime })
                : openState.nextTime && openState.nextDay
                  ? t("Opens {day} at {time}", {
                      day: openState.nextIsLater ? dayName(openState.nextDay) : t("today"),
                      time: openState.nextTime,
                    })
                  : t("No open hours set")}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 self-start">
          {canManage && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <IconPencil className="size-4" />
              {t("Edit")}
            </Button>
          )}

          {canManage && (canDelete || isDraft) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={isDraft ? onDiscardDraft : handleDelete}
              aria-label={isDraft ? t("Discard") : t("Delete schedule")}
            >
              {isDraft ? <IconX className="size-4" /> : <IconTrash className="size-4" />}
            </Button>
          )}
        </div>
      </div>

      <WeekStrip
        schedule={draft.schedule}
        activeDay={isEditing ? openDay : null}
        onSelectDay={(day) => {
          if (canManage && !isEditing) {
            setIsEditing(true);
            setOpenDay(day);
            return;
          }
          setOpenDay((current) => (current === day ? null : day));
        }}
        dayLabel={dayName}
        dayLabelShort={dayShort}
        describeDay={describeDay}
      />

      {!isEditing && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-4 text-sm">
          {weekSummary.map((row) => (
            <div key={row.days[0]} className="flex items-baseline gap-3">
              <span className="w-20 shrink-0 font-medium">
                {row.days.length > 1
                  ? `${dayShort(row.days[0])} – ${dayShort(row.days[row.days.length - 1])}`
                  : dayShort(row.days[0])}
              </span>
              <span
                className={cn(
                  "tabular-nums",
                  row.hours ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {row.hours || t("Closed")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Day rows, each expanding in place. */}
      {isEditing && (
        <div className="flex flex-col divide-y divide-border border-t border-border">
          {days.map((day) => {
            const daySchedule = draft.schedule[day];
            const isExpanded = openDay === day;
            const dayErrors = errorsByDay[day] ?? [];

            return (
              <div key={day} className="py-2">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setOpenDay(isExpanded ? null : day)}
                    aria-expanded={isExpanded}
                    className="flex min-w-0 flex-1 items-baseline gap-3 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="w-24 shrink-0 text-sm font-medium">{dayName(day)}</span>
                    <span
                      className={cn(
                        "truncate text-sm tabular-nums",
                        daySchedule.isOpen ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {daySchedule.isOpen
                        ? daySchedule.timeSlots
                            .map((slot) => `${slot.openTime} – ${slot.closeTime}`)
                            .join(", ")
                        : t("Closed")}
                    </span>
                  </button>

                  {canManage && (
                    <Switch
                      checked={daySchedule.isOpen}
                      aria-label={`${dayName(day)} — ${t("Open")}`}
                      onCheckedChange={(checked) => {
                        setDay(day, (current) => ({ ...current, isOpen: checked }));
                        if (checked) setOpenDay(day);
                      }}
                    />
                  )}
                </div>

                {canManage && isExpanded && daySchedule.isOpen && (
                  <div className="mt-3 flex flex-col gap-3 pl-0 sm:pl-24">
                    {daySchedule.timeSlots.map((slot, index) => (
                      <div key={index} className="flex flex-wrap items-center gap-2">
                        <TimeField
                          value={slot.openTime}
                          label={`${dayName(day)} — ${t("Opens")}`}
                          invalid={dayErrors.length > 0}
                          onChange={(next) =>
                            setDay(day, (current) => ({
                              ...current,
                              timeSlots: current.timeSlots.map((item, i) =>
                                i === index ? { ...item, openTime: next } : item,
                              ),
                            }))
                          }
                        />
                        <span className="text-sm text-muted-foreground">{t("to")}</span>
                        <TimeField
                          value={slot.closeTime}
                          label={`${dayName(day)} — ${t("Closes")}`}
                          invalid={dayErrors.length > 0}
                          onChange={(next) =>
                            setDay(day, (current) => ({
                              ...current,
                              timeSlots: current.timeSlots.map((item, i) =>
                                i === index ? { ...item, closeTime: next } : item,
                              ),
                            }))
                          }
                        />

                        {daySchedule.timeSlots.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={t("Remove this time range")}
                            onClick={() =>
                              setDay(day, (current) => ({
                                ...current,
                                timeSlots: current.timeSlots.filter((_, i) => i !== index),
                              }))
                            }
                          >
                            <IconX className="size-4" />
                          </Button>
                        )}
                      </div>
                    ))}

                    {dayErrors.map((message) => (
                      <p key={message} className="text-xs text-destructive">
                        {message}
                      </p>
                    ))}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDay(day, (current) => ({
                            ...current,
                            timeSlots: [
                              ...current.timeSlots,
                              { openTime: "14:00", closeTime: "18:00" },
                            ],
                          }))
                        }
                      >
                        <IconPlus className="size-4" />
                        {t("Add a break")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => applyTo(day, [...days])}>
                        {t("Apply to all days")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => applyTo(day, WEEKDAYS)}>
                        {t("Apply to weekdays")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer: timezone, what depends on this, and the weekly total. */}
      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {canManage && isEditing ? (
            <div className="max-w-72">
              <TimeZoneSelector
                value={draft.timezone}
                onChange={(timezone) => setDraft((prev) => ({ ...prev, timezone }))}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{draft.timezone}</p>
          )}

          <p className="text-xs text-muted-foreground tabular-nums">
            {t("{hours} hours a week answered by your team", { hours: weeklyHours })}
          </p>
        </div>

        {/* Attribution: editing these hours changes when these rules fire. Without this
            the consequence of a change is invisible until a customer notices. */}
        <p className="text-xs text-muted-foreground">
          {dependentRules.length === 0 ? (
            t("Not used by any automation rule yet")
          ) : (
            <>
              {t("Used by")}{" "}
              {dependentRules.map((rule, index) => (
                <span key={rule.id}>
                  {index > 0 && ", "}
                  <Link
                    to="/dashboard/automation/$automationId"
                    params={{ automationId: rule.id }}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {rule.name}
                  </Link>
                </span>
              ))}
            </>
          )}
        </p>
      </div>

      {canManage && isEditing && (
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            {isDirty ? t("Cancel") : t("Done")}
          </Button>
          <Button onClick={handleSave} disabled={!isDirty || !isValid || isSaving}>
            {isSaving ? t("Saving") : t("Save changes")}
          </Button>
        </div>
      )}
    </Card>
  );
}
