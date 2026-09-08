import { IconMinus, IconPlus, IconRefresh, IconSend, IconSparkles } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useCampaignRetryPolicy,
  useUpdateCampaignRetryPolicyMutation,
} from "@/backend/campaign/campaign.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { cn } from "@/lib/utils";
import { CampaignRetryStrategy } from "@/types/enums.ts";

import type { CampaignWizardStepProps } from "./step.types.ts";

/**
 * The attempt schedule each strategy produces.
 *
 * Mirrors `SMART_OFFSETS_MINUTES` in rateup-api's `campaignRetry.service.ts`.
 * The first offset is also the settle delay: when the queue drains, messages
 * Meta accepted are still `SENT` and only flip to `FAILED` when the status
 * webhook lands, so an earlier retry would find nothing to re-attempt. Keep the
 * two lists in step — the point of showing them is that they are what happens.
 */
const SMART_OFFSETS = ["+2m", "+4h", "+12h"] as const;

/** Retries stop this far out regardless of attempts left; the API clamps to it too. */
const MAX_WINDOW_DAYS = 7;

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
            <div className="grid grid-cols-2 gap-4">
              <StrategyCard
                selected={strategy === CampaignRetryStrategy.SMART}
                title={t("Smart retries")}
                recommended
                description={t(
                  "Retries soon, then backs off — most caps lift within the first hour.",
                )}
                offsets={SMART_OFFSETS.slice(0, maxAttempts)}
                onSelect={() => setStrategy(CampaignRetryStrategy.SMART)}
              />
              <StrategyCard
                selected={strategy === CampaignRetryStrategy.FIXED_INTERVAL}
                title={t("Every 24 hours")}
                description={t("Same time each day. Predictable, but slower to recover.")}
                offsets={Array.from({ length: maxAttempts }, (_, i) => `+${24 * (i + 1)}h`)}
                onSelect={() => setStrategy(CampaignRetryStrategy.FIXED_INTERVAL)}
              />
            </div>

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
                    {t("Give up on anything still blocked after this")}
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
                    {t("Retries due in this range wait for the morning")}
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
  selected,
  title,
  description,
  offsets,
  recommended = false,
  onSelect,
}: Readonly<{
  selected: boolean;
  title: string;
  description: string;
  offsets: readonly string[];
  recommended?: boolean;
  onSelect: () => void;
}>) {
  const { t } = useTranslation("campaign.wizard");
  // Spread the markers evenly; the first is the send itself.
  const positions = offsets.map((_, index) => ((index + 1) / offsets.length) * 100);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "bg-card flex cursor-pointer flex-col gap-4 rounded-xl p-5 text-left shadow-xs ring-1 transition",
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
        <span
          className={cn(
            "mt-0.5 size-4.5 shrink-0 rounded-full border",
            selected ? "border-primary border-[5px]" : "border-input border-[1.5px]",
          )}
          aria-hidden
        />
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
              key={offset}
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
    </button>
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
      <button
        type="button"
        aria-label={decrementLabel}
        disabled={value <= min}
        onClick={onDecrement}
        className="border-border text-secondary-foreground hover:bg-muted flex size-9 cursor-pointer items-center justify-center border-r disabled:cursor-default disabled:opacity-40"
      >
        <IconMinus className="size-4" aria-hidden />
      </button>
      <span
        aria-live="polite"
        className={cn("text-center text-sm font-semibold tabular-nums", wide ? "w-20" : "w-14")}
      >
        {display}
      </span>
      <button
        type="button"
        aria-label={incrementLabel}
        disabled={value >= max}
        onClick={onIncrement}
        className="border-border text-secondary-foreground hover:bg-muted flex size-9 cursor-pointer items-center justify-center border-l disabled:cursor-default disabled:opacity-40"
      >
        <IconPlus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
