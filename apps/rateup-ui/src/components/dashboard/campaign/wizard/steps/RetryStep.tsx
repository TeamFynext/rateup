import { IconMinus, IconPlus, IconRefresh, IconSend, IconSparkles } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useCampaignRetryPolicy,
  useUpdateCampaignRetryPolicyMutation,
} from "@/backend/campaign/campaign.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { cn } from "@/lib/utils";
import { CampaignRetryStrategy } from "@/types/enums.ts";

import { formatOffset, MAX_WINDOW_DAYS, previewSchedule, quietHoursOf } from "../retrySchedule.ts";
import type { CampaignWizardStepProps } from "./step.types.ts";

/**
 * Automatic retries for messages Meta refused.
 *
 * Only failures a later attempt could clear are re-attempted: frequency caps,
 * transient errors, and a number that could not receive the message at the time
 * of the send. A template Meta rejected is never retried, because waiting
 * changes nothing and each attempt spends a conversation from the org's
 * allowance.
 */
export function RetryStep({ wizard, registerSubmit }: Readonly<CampaignWizardStepProps>) {
  const { t } = useTranslation("campaign.wizard");
  const campaignId = wizard.campaign?.id ?? "";
  const { data: policy } = useCampaignRetryPolicy(campaignId);
  const updatePolicy = useUpdateCampaignRetryPolicyMutation(campaignId, { silent: true });

  const [enabled, setEnabled] = useState(false);
  const [strategy, setStrategy] = useState<CampaignRetryStrategy>(CampaignRetryStrategy.SMART);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [windowDays, setWindowDays] = useState(3);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("08:00");
  const [quietOn, setQuietOn] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrated once, from the saved policy. Not an effect that mirrors the query
  // on every render — that would fight the user's own edits after a refetch.
  useEffect(() => {
    if (hydrated || policy === undefined) return;
    if (policy) {
      setEnabled(policy.enabled);
      setStrategy(policy.strategy);
      setMaxAttempts(policy.maxAttempts);
      setQuietOn(Boolean(policy.quietHoursStart && policy.quietHoursEnd));
      setQuietStart(policy.quietHoursStart ?? "22:00");
      setQuietEnd(policy.quietHoursEnd ?? "08:00");
      if (policy.windowEndsAt) {
        const days = Math.ceil((new Date(policy.windowEndsAt).getTime() - Date.now()) / 86_400_000);
        setWindowDays(Math.min(Math.max(days, 1), MAX_WINDOW_DAYS));
      }
    }
    setHydrated(true);
  }, [policy, hydrated]);

  useEffect(() => {
    registerSubmit(async () => {
      const windowEndsAt = new Date();
      windowEndsAt.setDate(windowEndsAt.getDate() + windowDays);
      await updatePolicy.mutateAsync({
        campaignId,
        data: {
          enabled,
          strategy,
          maxAttempts,
          intervalHours: 24,
          windowEndsAt: windowEndsAt.toISOString(),
          // Both ends or neither: a half-open window silently never applies.
          quietHoursStart: quietOn ? quietStart : null,
          quietHoursEnd: quietOn ? quietEnd : null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Etc/UTC",
        },
      });
      wizard.continueAfterSave();
    });
  }, [
    registerSubmit,
    wizard,
    updatePolicy,
    campaignId,
    enabled,
    strategy,
    maxAttempts,
    windowDays,
    quietOn,
    quietStart,
    quietEnd,
  ]);

  // The smart schedule is not a fixed table: it divides the retry window across
  // the attempts, in waking time, so all three controls change the timeline. The
  // preview is anchored on a fixed hour rather than `new Date()` so it does not
  // re-shuffle under the user as the minutes tick past while they read it.
  const smartOffsets = useMemo(() => {
    const quiet = quietHoursOf(quietStart, quietEnd, quietOn);
    const from = new Date(new Date().setMinutes(0, 0, 0));
    return previewSchedule(maxAttempts, windowDays, quiet, from).map((attempt) =>
      formatOffset(attempt.elapsedMinutes),
    );
  }, [maxAttempts, windowDays, quietOn, quietStart, quietEnd]);

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const summary = t(
    "Messages Meta refused with a retryable error will be {cadence} up to {attempts} over {window}{quiet}.",
    {
      cadence:
        strategy === CampaignRetryStrategy.SMART ? t("retried") : t("retried every 24 hours,"),
      attempts: plural(maxAttempts, t("time")),
      window: plural(windowDays, t("day")),
      quiet: quietOn
        ? t(", never between {start} and {end}", { start: quietStart, end: quietEnd })
        : "",
    },
  );

  return (
    <div className="flex justify-center px-8 pt-8 pb-6">
      <div className="flex w-230 flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-xl font-bold tracking-tight">
            {t("Recover messages Meta blocks")}
          </h1>
          <p className="text-muted-foreground max-w-160 text-[13px] leading-relaxed">
            {t(
              "When a contact has received too many marketing messages recently, Meta rejects yours with error 131049. Retries re-send those automatically once the cap lifts — nothing else is re-sent.",
            )}
          </p>
        </div>

        <Card data-size="sm">
          <CardContent>
            <Field orientation="horizontal">
              <Switch id="campaign-retries" checked={enabled} onCheckedChange={setEnabled} />
              <div className="flex flex-col gap-0.5">
                <FieldLabel htmlFor="campaign-retries">{t("Retry blocked messages")}</FieldLabel>
                <FieldDescription>
                  {t(
                    "Only failures worth another attempt: frequency caps, temporary errors, and numbers that could not receive the message. Rejected templates are never retried.",
                  )}
                </FieldDescription>
              </div>
            </Field>
          </CardContent>
        </Card>

        {enabled ? (
          <>
            <RadioGroup
              value={strategy}
              onValueChange={(next) => next && setStrategy(next as CampaignRetryStrategy)}
              className="grid-cols-2 gap-4"
            >
              <StrategyCard
                value={CampaignRetryStrategy.SMART}
                selected={strategy === CampaignRetryStrategy.SMART}
                title={t("Smart retries")}
                recommended
                description={t(
                  "Retries soon, then spreads the rest across your window — most caps lift within the first hour.",
                )}
                offsets={smartOffsets}
              />
              <StrategyCard
                value={CampaignRetryStrategy.FIXED_INTERVAL}
                selected={strategy === CampaignRetryStrategy.FIXED_INTERVAL}
                title={t("Every 24 hours")}
                description={t("Same time each day. Predictable, but slower to recover.")}
                offsets={Array.from({ length: maxAttempts }, (_, i) => `+${24 * (i + 1)}h`)}
              />
            </RadioGroup>

            <Card data-size="sm">
              <CardContent className="grid grid-cols-[1fr_1fr_1.4fr] gap-6">
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-medium">{t("Max attempts")}</span>
                  <NumberStepper
                    value={maxAttempts}
                    display={String(maxAttempts)}
                    onDecrement={() => setMaxAttempts((n) => Math.max(n - 1, 1))}
                    onIncrement={() => setMaxAttempts((n) => Math.min(n + 1, 3))}
                    min={1}
                    max={3}
                    decrementLabel={t("Fewer attempts")}
                    incrementLabel={t("More attempts")}
                  />
                  <span className="text-muted-foreground/70 text-xs">
                    {t("1–3 retries after the first send")}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-medium">{t("Retry window")}</span>
                  <NumberStepper
                    value={windowDays}
                    display={t("{count} days", { count: windowDays })}
                    onDecrement={() => setWindowDays((n) => Math.max(n - 1, 1))}
                    onIncrement={() => setWindowDays((n) => Math.min(n + 1, MAX_WINDOW_DAYS))}
                    min={1}
                    max={MAX_WINDOW_DAYS}
                    wide
                    decrementLabel={t("Shorter window")}
                    incrementLabel={t("Longer window")}
                  />
                  <span className="text-muted-foreground/70 text-xs">
                    {strategy === CampaignRetryStrategy.SMART
                      ? t("The last attempt lands here; anything still blocked is given up")
                      : t("Give up on anything still blocked after this")}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium">{t("Quiet hours")}</span>
                    <Switch
                      id="campaign-quiet-hours"
                      checked={quietOn}
                      onCheckedChange={setQuietOn}
                      aria-label={t("Quiet hours")}
                    />
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                    <Input
                      type="time"
                      disabled={!quietOn}
                      aria-label={t("Quiet hours start")}
                      value={quietStart}
                      onChange={(event) => setQuietStart(event.target.value)}
                    />
                    <span className="text-muted-foreground/70 text-center text-[13px]">–</span>
                    <Input
                      type="time"
                      disabled={!quietOn}
                      aria-label={t("Quiet hours end")}
                      value={quietEnd}
                      onChange={(event) => setQuietEnd(event.target.value)}
                    />
                  </div>
                  <span className="text-muted-foreground/70 text-xs">
                    {strategy === CampaignRetryStrategy.SMART
                      ? t("Excluded from the spacing, so no attempt is due in this range")
                      : t("Retries due in this range wait for the morning")}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="border-primary/20 bg-accent flex items-start gap-2.5 rounded-[10px] border px-4 py-3.5">
              <IconSparkles className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="text-foreground text-sm leading-relaxed">{summary}</span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A strategy, with the schedule it produces drawn as a timeline.
 *
 * The picture is the point: "smart" and "every 24 hours" are indistinguishable
 * as words, and completely different as a shape.
 */
function StrategyCard({
  value,
  selected,
  title,
  description,
  offsets,
  recommended = false,
}: Readonly<{
  value: CampaignRetryStrategy;
  selected: boolean;
  title: string;
  description: string;
  offsets: readonly string[];
  recommended?: boolean;
}>) {
  const { t } = useTranslation("campaign.wizard");
  // Spread the markers evenly; the first is the send itself.
  const positions = offsets.map((_, index) => ((index + 1) / offsets.length) * 100);

  return (
    <Label
      className={cn(
        "bg-card flex cursor-pointer flex-col items-stretch gap-4 rounded-xl p-5 text-left font-normal shadow-xs ring-1 transition",
        selected ? "ring-primary ring-2" : "ring-foreground/10 hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="font-display text-[15px] font-semibold">{title}</span>
            {recommended ? <Badge variant="system">{t("Recommended")}</Badge> : null}
          </span>
          <span className="text-muted-foreground text-[12.5px] leading-relaxed">{description}</span>
        </div>
        <RadioGroupItem value={value} className="mt-0.5 size-4.5 shrink-0" />
      </div>

      <div className="relative h-16 px-2">
        <span className="bg-border absolute inset-x-3.5 top-3.5 h-0.5" aria-hidden />
        {selected ? (
          <span
            className="bg-primary absolute top-3.5 left-3.5 h-0.5"
            style={{ width: `${positions[0] ?? 0}%` }}
            aria-hidden
          />
        ) : null}

        <span className="absolute top-0 left-0 flex w-7 flex-col items-center gap-2">
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-white",
              selected ? "bg-primary" : "bg-muted-foreground",
            )}
          >
            <IconSend className="size-3.5" aria-hidden />
          </span>
          <span className="text-foreground text-[11.5px] font-semibold whitespace-nowrap">
            {t("Send")}
          </span>
        </span>

        {offsets.map((offset, index) => {
          const isLast = index === offsets.length - 1;
          return (
            <span
              key={`${index}-${offset}`}
              className={cn(
                "absolute top-0 flex w-7 flex-col items-center gap-2",
                isLast && "right-0",
              )}
              style={
                isLast
                  ? undefined
                  : { left: `${positions[index]}%`, transform: "translateX(-14px)" }
              }
            >
              <span
                className={cn(
                  "bg-card flex size-7 items-center justify-center rounded-full border-2",
                  selected ? "border-primary text-primary" : "border-input text-muted-foreground",
                )}
              >
                <IconRefresh className="size-3" aria-hidden />
              </span>
              <span className="text-secondary-foreground text-[11.5px] font-medium tabular-nums whitespace-nowrap">
                {offset}
              </span>
            </span>
          );
        })}
      </div>
    </Label>
  );
}

/** The segmented −/value/+ control the design uses for both numeric settings. */
function NumberStepper({
  value,
  display,
  onDecrement,
  onIncrement,
  min,
  max,
  wide = false,
  decrementLabel,
  incrementLabel,
}: Readonly<{
  value: number;
  display: string;
  onDecrement: () => void;
  onIncrement: () => void;
  min: number;
  max: number;
  wide?: boolean;
  decrementLabel: string;
  incrementLabel: string;
}>) {
  return (
    <div className="ring-border inline-flex h-9 w-max items-center overflow-hidden rounded-lg ring-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={decrementLabel}
        disabled={value <= min}
        onClick={onDecrement}
        className="border-border size-9 rounded-none border-r"
      >
        <IconMinus aria-hidden />
      </Button>
      <span
        aria-live="polite"
        className={cn("text-center text-sm font-semibold tabular-nums", wide ? "w-20" : "w-14")}
      >
        {display}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={incrementLabel}
        disabled={value >= max}
        onClick={onIncrement}
        className="border-border size-9 rounded-none border-l"
      >
        <IconPlus aria-hidden />
      </Button>
    </div>
  );
}
