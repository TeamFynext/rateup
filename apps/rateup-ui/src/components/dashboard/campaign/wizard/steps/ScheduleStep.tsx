import { IconAlertTriangle, IconCalendarCheck, IconClock } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCampaignSendPreflight } from "@/backend/campaign/campaign.query";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { cn } from "@/lib/utils";
import { CampaignParticipantStatus } from "@/types/enums.ts";

import { MonthCalendar } from "../MonthCalendar.tsx";
import { TIMEZONE_OPTIONS } from "../timezones.ts";
import type { CampaignWizardStepProps } from "./step.types.ts";

/** A date plus "HH:mm" as a Date in the browser's own timezone. */
function combine(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}

/**
 * When to send, how fast, and whether to respect marketing consent.
 *
 * Optional — leaving it alone means "send now, all at once, consent respected",
 * which is what the send dialog has always defaulted to. The pacing projection
 * beside the daily cap is the part that earns its place: "1,000/day" means
 * nothing until it is turned into a finish date.
 */
export function ScheduleStep({ wizard, registerSubmit }: Readonly<CampaignWizardStepProps>) {
  const { t } = useTranslation("campaign.wizard");
  const { campaign } = wizard;

  const [sendLater, setSendLater] = useState(Boolean(campaign?.campaignSentAt));
  const [date, setDate] = useState<Date>(
    campaign?.campaignSentAt ? new Date(campaign.campaignSentAt) : new Date(),
  );
  const [time, setTime] = useState(
    campaign?.campaignSentAt
      ? new Date(campaign.campaignSentAt).toTimeString().slice(0, 5)
      : "09:00",
  );
  const [throttled, setThrottled] = useState(campaign?.dailySendLimit != null);
  const [dailySendLimit, setDailySendLimit] = useState(
    campaign?.dailySendLimit ? String(campaign.dailySendLimit) : "1000",
  );
  const [useUserConsent, setUseUserConsent] = useState(campaign?.useUserConsent ?? true);
  const [timezone, setTimezone] = useState(
    campaign?.timezone && campaign.timezone !== "Etc/UTC"
      ? campaign.timezone
      : Intl.DateTimeFormat().resolvedOptions().timeZone || "Etc/UTC",
  );

  const preflight = useCampaignSendPreflight(
    campaign?.id ?? "",
    [CampaignParticipantStatus.PENDING],
    Boolean(campaign?.id),
  );

  const recipients = preflight.data?.recipients ?? campaign?.campaignParticipantsCount ?? 0;
  const perDay = Number(dailySendLimit);

  /** When a paced send would finish, which is the only reading of a daily cap that matters. */
  const finishesOn = useMemo(() => {
    if (!throttled || !perDay || perDay <= 0 || recipients === 0) return null;
    const days = Math.ceil(recipients / perDay);
    const start = sendLater ? combine(date, time) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    return { days, end };
  }, [throttled, perDay, recipients, sendLater, date, time]);

  useEffect(() => {
    registerSubmit(async () => {
      await wizard.saveAndContinue({
        campaignSentAt: sendLater ? combine(date, time) : null,
        // An empty box means "no cap", which the column stores as null rather
        // than as a very large number.
        dailySendLimit: throttled && perDay > 0 ? perDay : null,
        useUserConsent,
        timezone,
      });
    });
  }, [registerSubmit, wizard, sendLater, date, time, throttled, perDay, useUserConsent, timezone]);

  const shortfall = preflight.data?.metered ? preflight.data.shortfall : 0;
  const remaining = preflight.data?.remaining ?? 0;

  return (
    <div className="flex justify-center px-8 pt-8 pb-6">
      <div className="flex w-230 flex-col gap-6">
        <div className="flex items-end justify-between gap-5">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-xl font-bold tracking-tight">
              {t("When should it go out?")}
            </h1>
            <p className="text-muted-foreground text-[13px]">
              {t("Times are shown in your own timezone.")}
            </p>
          </div>
          <Tabs
            value={sendLater ? "later" : "now"}
            onValueChange={(value) => setSendLater(value === "later")}
          >
            <TabsList>
              <TabsTrigger value="now">{t("Send now")}</TabsTrigger>
              <TabsTrigger value="later">{t("Schedule")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-[400px_1fr] items-start gap-5">
          <Card data-size="sm" className={cn(!sendLater && "opacity-55")}>
            <CardContent className="flex flex-col gap-4">
              <MonthCalendar
                value={date}
                onChange={setDate}
                disabled={!sendLater}
                minDate={new Date()}
              />
              {/* Time and zone together: "10:00" is only a time once you know
                  where, and the person setting it is rarely in the same place as
                  the next person to open the campaign. */}
              <div className="grid grid-cols-[1fr_1.4fr] gap-3">
                <Field>
                  <FieldLabel htmlFor="campaign-send-time">{t("Time")}</FieldLabel>
                  <div className="relative">
                    <IconClock
                      className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                      aria-hidden
                    />
                    <Input
                      id="campaign-send-time"
                      type="time"
                      disabled={!sendLater}
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                      className="pl-9"
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel>{t("Timezone")}</FieldLabel>
                  <Select
                    items={TIMEZONE_OPTIONS}
                    value={timezone}
                    disabled={!sendLater}
                    onValueChange={(value) => setTimezone(value ?? "Etc/UTC")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card data-size="sm">
              <CardContent className="flex flex-col gap-4">
                <Field orientation="horizontal">
                  <Switch
                    id="campaign-throttle"
                    checked={throttled}
                    onCheckedChange={setThrottled}
                  />
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel htmlFor="campaign-throttle">{t("Daily send limit")}</FieldLabel>
                    <FieldDescription>
                      {t("Spread the send over several days so replies stay manageable.")}
                    </FieldDescription>
                  </div>
                </Field>

                {throttled ? (
                  <div className="grid grid-cols-[200px_1fr] items-end gap-4">
                    <Field>
                      <FieldLabel htmlFor="campaign-daily-limit">
                        {t("Messages per day")}
                      </FieldLabel>
                      <Input
                        id="campaign-daily-limit"
                        type="number"
                        min={1}
                        value={dailySendLimit}
                        onChange={(event) => setDailySendLimit(event.target.value)}
                      />
                    </Field>
                    <div className="bg-muted text-secondary-foreground flex h-9 items-center gap-2 rounded-lg px-3 text-[13px]">
                      <IconCalendarCheck
                        className="text-muted-foreground size-4 shrink-0"
                        aria-hidden
                      />
                      {finishesOn ? (
                        <span className="truncate">
                          {t("{recipients} recipients at {perDay}/day → finishes", {
                            recipients: recipients.toLocaleString(),
                            perDay: perDay.toLocaleString(),
                          })}{" "}
                          <strong className="text-foreground font-semibold">
                            {finishesOn.end.toLocaleDateString(undefined, {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </strong>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {t("Add recipients to see how long this will take.")}
                        </span>
                      )}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card data-size="sm">
              <CardContent>
                <Field orientation="horizontal">
                  <Switch
                    id="campaign-consent"
                    checked={useUserConsent}
                    onCheckedChange={setUseUserConsent}
                  />
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel htmlFor="campaign-consent">
                      {t("Only send to contacts who opted in")}
                    </FieldLabel>
                    <FieldDescription>
                      {t(
                        "Recommended — required for marketing templates in several countries. Skips contacts with no recorded WhatsApp opt-in.",
                      )}
                    </FieldDescription>
                  </div>
                </Field>
              </CardContent>
            </Card>

            {preflight.data?.metered ? (
              <div
                className={cn(
                  "flex items-start gap-2.5 rounded-[10px] border px-4 py-3.5",
                  shortfall > 0
                    ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30"
                    : "border-border bg-muted",
                )}
              >
                {shortfall > 0 ? (
                  <IconAlertTriangle
                    className="mt-px size-4 shrink-0 text-amber-700 dark:text-amber-500"
                    aria-hidden
                  />
                ) : null}
                <div className="flex flex-col gap-0.5 text-[13px] leading-snug">
                  <span className="text-foreground font-semibold">
                    {t("This will use {recipients} of your {remaining} remaining conversations.", {
                      recipients: recipients.toLocaleString(),
                      remaining: remaining.toLocaleString(),
                    })}
                  </span>
                  <span className="text-secondary-foreground">
                    {shortfall > 0
                      ? t(
                          "{shortfall} recipients are beyond the allowance and will not receive it.",
                          {
                            shortfall,
                          },
                        )
                      : t("Retries of blocked messages don't count twice.")}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
