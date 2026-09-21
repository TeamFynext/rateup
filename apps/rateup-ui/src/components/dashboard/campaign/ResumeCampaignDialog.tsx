import { IconClock } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { cn } from "@/lib/utils";

import { MonthCalendar } from "./wizard/MonthCalendar.tsx";

/** What resuming should do about timing. */
export type ResumeChoice = "keep" | "now" | "custom";

/** A date plus "HH:mm" as a Date in the browser's own timezone. */
function combine(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}

const formatWhen = (date: Date) =>
  date.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * The three ways to pick a campaign back up.
 *
 * Resume used to be a single button that silently chose for you — back on the
 * paused schedule if one was still ahead, out immediately otherwise. Both are
 * reasonable and neither is guessable from the button, and the one case the
 * button could not express at all is the common one: the schedule has been
 * overtaken by events and the sender wants a new time, which meant editing the
 * campaign in the wizard just to start it again.
 *
 * `scheduledFor` absent means the campaign was never scheduled, or its time has
 * passed — there is nothing to keep, so the choice is now-or-pick.
 */
export function ResumeCampaignDialog({
  open,
  onOpenChange,
  scheduledFor,
  pendingCount,
  isPending,
  onConfirm,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The send time the pause took away, when it is still in the future. */
  scheduledFor: string | null;
  pendingCount: number;
  isPending: boolean;
  /** `null` sends immediately; a date schedules it. */
  onConfirm: (sendAt: Date | null) => void;
}>) {
  const { t } = useTranslation("campaign.details");

  const [choice, setChoice] = useState<ResumeChoice>(scheduledFor ? "keep" : "now");
  const [date, setDate] = useState<Date>(() =>
    scheduledFor ? new Date(scheduledFor) : new Date(),
  );
  const [time, setTime] = useState(() =>
    scheduledFor ? new Date(scheduledFor).toTimeString().slice(0, 5) : "09:00",
  );

  // Reopening the dialog is a fresh decision — an abandoned custom time from the
  // last time it was open is not one the sender still means.
  useEffect(() => {
    if (!open) return;
    setChoice(scheduledFor ? "keep" : "now");
    setDate(scheduledFor ? new Date(scheduledFor) : new Date());
    setTime(scheduledFor ? new Date(scheduledFor).toTimeString().slice(0, 5) : "09:00");
  }, [open, scheduledFor]);

  const custom = useMemo(() => combine(date, time), [date, time]);
  // A time in the past would be scheduled and then fire at once, which is "now"
  // pretending to be a schedule. Better to say so and let it be corrected.
  const customIsPast = choice === "custom" && custom.getTime() <= Date.now();

  const confirm = () => {
    if (choice === "now") return onConfirm(null);
    if (choice === "keep" && scheduledFor) return onConfirm(new Date(scheduledFor));
    onConfirm(custom);
  };

  const options: { value: ResumeChoice; label: string; hint: string }[] = [
    ...(scheduledFor
      ? [
          {
            value: "keep" as const,
            label: t("Keep its schedule"),
            hint: formatWhen(new Date(scheduledFor)),
          },
        ]
      : []),
    {
      value: "now",
      label: t("Send now"),
      hint: t("Goes out to the {count} recipients not messaged yet", {
        count: pendingCount.toLocaleString(),
      }),
    },
    {
      value: "custom",
      label: t("Pick a new date and time"),
      hint: t("Times are in your own timezone."),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The calendar makes this the tallest dialog in the app — on a laptop in a
          short window it is taller than the viewport. Header and footer stay put
          and the choices scroll between them, so Resume is never off-screen. */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-105">
        <DialogHeader>
          <DialogTitle>{t("Resume campaign")}</DialogTitle>
          <DialogDescription>
            {t("Only the {count} recipients who were never messaged are sent to.", {
              count: pendingCount.toLocaleString(),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex min-h-0 flex-col gap-6 overflow-y-auto px-1">
          <RadioGroup value={choice} onValueChange={(value) => setChoice(value as ResumeChoice)}>
            {options.map((option) => (
              <Label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 text-left font-normal",
                  choice === option.value ? "border-primary bg-primary/5" : "border-input",
                )}
              >
                <RadioGroupItem value={option.value} className="mt-0.5" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-[13.5px] font-medium">{option.label}</span>
                  <span className="text-muted-foreground text-xs">{option.hint}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>

          {choice === "custom" ? (
            <div className="flex flex-col gap-3.5">
              <MonthCalendar value={date} onChange={setDate} minDate={new Date()} />
              <Field>
                <FieldLabel htmlFor="campaign-resume-time">{t("Time")}</FieldLabel>
                <div className="relative">
                  <IconClock
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                    aria-hidden
                  />
                  <Input
                    id="campaign-resume-time"
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    className="pl-9"
                  />
                </div>
              </Field>
              {customIsPast ? (
                <p className="text-destructive text-xs">
                  {t("That time has already passed. Pick a later one, or choose Send now.")}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  {t("Goes out {when}", { when: formatWhen(custom) })}
                </p>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} loading={isPending}>
            {t("Cancel")}
          </Button>
          <Button onClick={confirm} disabled={isPending || customIsPast}>
            {t("Resume")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
