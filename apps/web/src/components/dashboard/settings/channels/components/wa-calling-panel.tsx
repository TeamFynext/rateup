import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  callKeys,
  type CallSettings,
  type DayOfWeek,
  getCallSettings,
  updateCallSettings,
} from "@/backend/whatsapp/calling/calling.api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { getApiErrorMessage } from "@/utils/apiError";

const DAYS: { day: DayOfWeek; label: string }[] = [
  { day: "MONDAY", label: "Monday" },
  { day: "TUESDAY", label: "Tuesday" },
  { day: "WEDNESDAY", label: "Wednesday" },
  { day: "THURSDAY", label: "Thursday" },
  { day: "FRIDAY", label: "Friday" },
  { day: "SATURDAY", label: "Saturday" },
  { day: "SUNDAY", label: "Sunday" },
];

/** Meta stores times as `HHMM`; a time input speaks `HH:MM`. */
const toInput = (hhmm: string) => `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
const fromInput = (value: string) => value.replace(":", "");

interface DayHours {
  open: boolean;
  from: string;
  to: string;
}

function weekFrom(hoursFor: (day: DayOfWeek) => DayHours): Record<DayOfWeek, DayHours> {
  return {
    MONDAY: hoursFor("MONDAY"),
    TUESDAY: hoursFor("TUESDAY"),
    WEDNESDAY: hoursFor("WEDNESDAY"),
    THURSDAY: hoursFor("THURSDAY"),
    FRIDAY: hoursFor("FRIDAY"),
    SATURDAY: hoursFor("SATURDAY"),
    SUNDAY: hoursFor("SUNDAY"),
  };
}

/**
 * WhatsApp voice calling for one number: whether customers can call it, whether the call
 * button shows in their chat, and the hours it takes calls. Meta holds these settings —
 * nothing is stored on our side, so the panel always shows what WhatsApp is enforcing.
 */
export function WaCallingPanel({
  phoneId,
  enabled = true,
}: Readonly<{ phoneId: string; enabled?: boolean }>) {
  const { t } = useTranslation();
  const { data, isPending, error, dataUpdatedAt } = useQuery({
    queryKey: callKeys.settings(phoneId),
    queryFn: () => getCallSettings(phoneId),
    enabled: enabled && Boolean(phoneId),
  });

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("Could not load calling settings")}</AlertTitle>
        <AlertDescription>
          {getApiErrorMessage(
            error,
            t("WhatsApp calling needs a messaging limit of at least 2,000 customers a day."),
          )}
        </AlertDescription>
      </Alert>
    );
  }
  // Keyed on the fetch so a save or refetch starts the form from what Meta now holds.
  return <CallingForm key={dataUpdatedAt} phoneId={phoneId} initial={data} />;
}

function CallingForm({ phoneId, initial }: Readonly<{ phoneId: string; initial: CallSettings }>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(initial.status === "ENABLED");
  const [showIcon, setShowIcon] = useState(initial.call_icon_visibility !== "DISABLE_ALL");
  const [callbacks, setCallbacks] = useState(initial.callback_permission_status === "ENABLED");
  const [hoursOn, setHoursOn] = useState(initial.call_hours?.status === "ENABLED");
  const [timezone, setTimezone] = useState(
    initial.call_hours?.timezone_id || Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [week, setWeek] = useState(() => {
    const byDay = new Map(
      (initial.call_hours?.weekly_operating_hours ?? []).map((h) => [h.day_of_week, h]),
    );
    const hasSchedule = byDay.size > 0;
    return weekFrom((day) => {
      const hours = byDay.get(day);
      return {
        // With no schedule yet, start from a weekday 9–6 rather than an empty week.
        open: hours ? true : !hasSchedule && day !== "SATURDAY" && day !== "SUNDAY",
        from: hours ? toInput(hours.open_time) : "09:00",
        to: hours ? toInput(hours.close_time) : "18:00",
      };
    });
  });

  const save = useMutation({
    mutationFn: () => {
      const settings: CallSettings = {
        status: enabled ? "ENABLED" : "DISABLED",
        call_icon_visibility: showIcon ? "DEFAULT" : "DISABLE_ALL",
        callback_permission_status: callbacks ? "ENABLED" : "DISABLED",
        call_hours: {
          status: hoursOn ? "ENABLED" : "DISABLED",
          timezone_id: timezone,
          weekly_operating_hours: DAYS.filter(({ day }) => week[day].open).map(({ day }) => ({
            day_of_week: day,
            open_time: fromInput(week[day].from),
            close_time: fromInput(week[day].to),
          })),
          holiday_schedule: initial.call_hours?.holiday_schedule ?? [],
        },
      };
      return updateCallSettings({ phoneId, settings });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(callKeys.settings(phoneId), data);
      toast.success(t("Calling settings saved"));
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, t("Could not save calling settings"))),
  });

  const updateDay = (day: DayOfWeek, patch: Partial<DayHours>) =>
    setWeek((current) => ({ ...current, [day]: { ...current[day], ...patch } }));

  return (
    <div className="flex flex-col gap-5">
      <SettingRow
        title={t("Voice calls")}
        description={t(
          "Customers can call this number on WhatsApp, and agents answer from the inbox in their browser.",
        )}
        checked={enabled}
        onChange={setEnabled}
      />
      <SettingRow
        title={t("Call button in chat")}
        description={t("Show the call icon at the top of the customer's chat with you.")}
        checked={showIcon}
        onChange={setShowIcon}
        disabled={!enabled}
      />
      <SettingRow
        title={t("Callback requests")}
        description={t(
          "When a customer calls and nobody answers, ask them if you may call them back.",
        )}
        checked={callbacks}
        onChange={setCallbacks}
        disabled={!enabled}
      />
      <SettingRow
        title={t("Calling hours")}
        description={t("Outside these hours customers cannot call; they see when you are open.")}
        checked={hoursOn}
        onChange={setHoursOn}
        disabled={!enabled}
      />

      {enabled && hoursOn && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t("Time zone")}</span>
            <Input
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="Asia/Kolkata"
            />
          </label>
          <ul className="flex flex-col gap-2">
            {DAYS.map(({ day, label }) => (
              <li key={day} className="flex flex-wrap items-center gap-2">
                <Switch
                  size="sm"
                  checked={week[day].open}
                  onCheckedChange={(open) => updateDay(day, { open })}
                  aria-label={t(label)}
                />
                <span className="w-24 text-sm">{t(label)}</span>
                {week[day].open ? (
                  <>
                    <Input
                      type="time"
                      className="w-28"
                      value={week[day].from}
                      onChange={(event) => updateDay(day, { from: event.target.value })}
                      aria-label={t("{day} opens", { day: t(label) })}
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <Input
                      type="time"
                      className="w-28"
                      value={week[day].to}
                      onChange={(event) => updateDay(day, { to: event.target.value })}
                      aria-label={t("{day} closes", { day: t(label) })}
                    />
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">{t("Closed")}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end">
        <Button loading={save.isPending} onClick={() => save.mutate()}>
          {t("Save")}
        </Button>
      </div>
    </div>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: Readonly<{
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}>) {
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={title} />
    </div>
  );
}
