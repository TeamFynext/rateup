import { IconAlertTriangle, IconPencil, IconRocket, IconSend } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isValidPhoneNumber } from "react-phone-number-input";

import {
  useCampaignRetryPolicy,
  useCampaignSendPreflight,
  useSendCampaign,
  useSendCampaignTestMutation,
} from "@/backend/campaign/campaign.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import useTemplatesAvailableForTeam from "@/hooks/team.tsx";
import { cn } from "@/lib/utils";
import {
  CampaignParticipantStatus,
  CampaignRetryStrategy,
  CampaignStatus,
  SentCampaignChoice,
} from "@/types/enums.ts";

import type { CampaignWizardStep } from "../useCampaignWizard.ts";
import type { CampaignWizardStepProps } from "./step.types.ts";

interface ReviewCard {
  step: CampaignWizardStep;
  title: string;
  badge: string;
  tone: "ok" | "todo";
  lines: { k: string; v: string }[];
}

/**
 * The last look before launch.
 *
 * A card per step, each carrying a badge that says whether that step is settled,
 * so an unfinished draft reads as unfinished at a glance rather than through the
 * absence of something. The rail on the right is the decision: what it costs and
 * the button that spends it.
 */
export function ReviewStep({ wizard, registerSubmit }: Readonly<CampaignWizardStepProps>) {
  const { t } = useTranslation("campaign.wizard");
  const navigate = useNavigate();
  const { campaign } = wizard;
  const campaignId = campaign?.id ?? "";

  const templates = useTemplatesAvailableForTeam(campaign?.teamId ?? "");
  const template = templates.find((tpl) => tpl.id === campaign?.waTemplateId);
  const { data: retryPolicy } = useCampaignRetryPolicy(campaignId);

  const statuses = [CampaignParticipantStatus.PENDING];
  const preflight = useCampaignSendPreflight(campaignId, statuses, Boolean(campaignId));
  const sendCampaign = useSendCampaign(campaignId, campaign?.teamId ?? "");
  const sendTest = useSendCampaignTestMutation();
  const [testPhone, setTestPhone] = useState("");
  // A number the picker itself calls valid: the button is the only guard here,
  // and a test send spends a conversation whether or not anyone receives it.
  const testPhoneIsValid = Boolean(testPhone) && isValidPhoneNumber(testPhone);

  // Review has no "Next"; the shell hides the button on the last step. Registered
  // anyway so a stale submit from the previous step can never fire here — and so
  // "Save & exit" still leaves: this step only reads the draft, so there is
  // nothing to write before going.
  useEffect(() => {
    registerSubmit(() => wizard.continueAfterSave());
  }, [registerSubmit, wizard]);

  if (!campaign) return null;

  const scheduled = Boolean(campaign.campaignSentAt);
  // A campaign that has already gone out once — reached through "Send to more"
  // rather than through creating one. `statuses` is PENDING, so the preflight
  // count is already exactly the recipients it has never messaged; what was
  // missing is anywhere that says so before the button is pressed.
  const alreadySent = Boolean(campaign.startedAt);
  const recipients = preflight.data?.recipients ?? campaign.campaignParticipantsCount ?? 0;
  const shortfall = preflight.data?.metered ? preflight.data.shortfall : 0;
  const exhausted = preflight.data?.exhausted ?? false;
  const remaining = preflight.data?.remaining ?? 0;
  const perDay = campaign.dailySendLimit ?? null;

  const startsAt = scheduled
    ? new Date(campaign.campaignSentAt as Date).toLocaleString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : t("As soon as you launch");

  const retriesShort = retryPolicy?.enabled
    ? `${retryPolicy.strategy === CampaignRetryStrategy.SMART ? t("Smart") : t("Every 24h")} · ${t(
        "up to {count}",
        { count: retryPolicy.maxAttempts },
      )}`
    : t("Off");

  const cards: ReviewCard[] = [
    {
      step: "basics",
      title: t("Basics"),
      badge: t("Set"),
      tone: "ok",
      lines: [
        { k: t("Name"), v: campaign.name },
        { k: t("Type"), v: wizard.isDrip ? t("Drip") : t("Broadcast") },
      ],
    },
    {
      step: "template",
      title: t("Template"),
      badge: wizard.isDrip
        ? campaign.dripStages?.length
          ? t("Set")
          : t("Needed")
        : campaign.waTemplateId
          ? t("Set")
          : t("Needed"),
      tone: (wizard.isDrip ? campaign.dripStages?.length : campaign.waTemplateId) ? "ok" : "todo",
      lines: wizard.isDrip
        ? [{ k: t("Stages"), v: String(campaign.dripStages?.length ?? 0) }]
        : [
            { k: t("Name"), v: template?.data?.name ?? t("Not chosen") },
            { k: t("Language"), v: template?.data?.language ?? "—" },
          ],
    },
    {
      step: "audience",
      title: t("Audience"),
      badge: recipients > 0 ? t("Set") : t("Empty"),
      tone: recipients > 0 ? "ok" : "todo",
      lines: [{ k: t("Recipients"), v: recipients.toLocaleString() }],
    },
    {
      step: "schedule",
      title: t("Schedule"),
      badge: scheduled ? t("Scheduled") : t("Immediate"),
      tone: "ok",
      lines: [
        { k: t("Starts"), v: startsAt },
        { k: t("Pace"), v: perDay ? t("{count}/day", { count: perDay }) : t("All at once") },
      ],
    },
    ...(wizard.isDrip
      ? []
      : [
          {
            step: "retries" as const,
            title: t("Retries"),
            badge: retryPolicy?.enabled ? t("On") : t("Off"),
            tone: (retryPolicy?.enabled ? "ok" : "todo") as "ok" | "todo",
            lines: [
              { k: t("Strategy"), v: retriesShort },
              {
                k: t("Quiet hours"),
                v:
                  retryPolicy?.quietHoursStart && retryPolicy?.quietHoursEnd
                    ? `${retryPolicy.quietHoursStart}–${retryPolicy.quietHoursEnd}`
                    : t("None"),
              },
            ],
          },
        ]),
  ];

  const outstanding = cards.filter((card) => card.tone === "todo").length;

  const launch = async () => {
    await sendCampaign.mutateAsync({
      statuses,
      sentCampaignChoice: scheduled ? SentCampaignChoice.LATER : SentCampaignChoice.NOW,
      campaignSentAt: campaign.campaignSentAt ? new Date(campaign.campaignSentAt) : undefined,
      status: CampaignStatus.ACTIVE,
      type: campaign.type,
      dailySendLimit: campaign.dailySendLimit ?? null,
    });
    void navigate({ to: "/dashboard/campaign/$campaignId", params: { campaignId } });
  };

  return (
    <div className="flex items-start gap-6 px-8 py-8">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-xl font-bold tracking-tight">
            {t("Everything ready?")}
          </h1>
          <p className="text-muted-foreground text-[13px]">
            {outstanding === 0
              ? t("Nothing outstanding. Launch when you are ready.")
              : t("{count} items aren't set. You can still launch — or fix them in a click.", {
                  count: outstanding,
                })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {cards.map((card) => (
            <div
              key={card.step}
              className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl px-5 py-4.5 shadow-xs ring-1"
            >
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[15px] font-semibold">{card.title}</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      card.tone === "ok"
                        ? "bg-green-600/10 text-green-700 dark:text-green-500"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
                    )}
                  >
                    {card.badge}
                  </Badge>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto gap-1 p-0 text-[12.5px]"
                  onClick={() => wizard.goToStep(card.step)}
                >
                  <IconPencil className="size-3" aria-hidden />
                  {t("Edit")}
                </Button>
              </div>
              <div className="flex flex-col gap-1.5">
                {card.lines.map((line) => (
                  <div key={line.k} className="flex justify-between gap-3 text-[13px]">
                    <span className="text-muted-foreground shrink-0">{line.k}</span>
                    <span className="truncate text-right font-medium tabular-nums">{line.v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The decision, held still while the cards scroll past it. */}
      <aside className="bg-card ring-foreground/10 sticky top-0 flex w-80 shrink-0 flex-col gap-4 rounded-xl p-5 shadow-xs ring-1">
        <span className="font-display truncate text-[15px] font-semibold">{campaign.name}</span>

        <div className="flex flex-col gap-3 text-[13px]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">{t("Recipients")}</span>
            <span className="font-display text-lg font-bold tabular-nums">
              {recipients.toLocaleString()}
            </span>
          </div>
          <span className="bg-border h-px" aria-hidden />
          <SummaryLine label={t("Template")} value={template?.data?.name ?? t("Not chosen")} mono />
          <SummaryLine label={t("Starts")} value={startsAt} />
          <SummaryLine
            label={t("Pace")}
            value={perDay ? t("{count}/day", { count: perDay }) : t("All at once")}
          />
          {wizard.isDrip ? null : <SummaryLine label={t("Retries")} value={retriesShort} />}

          {preflight.data?.metered ? (
            <>
              <span className="bg-border h-px" aria-hidden />
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{t("Allowance after launch")}</span>
                  <span className="font-medium tabular-nums">
                    {t("{count} left", { count: Math.max(remaining - recipients, 0) })}
                  </span>
                </div>
                {/* Used, then what this send takes — so the bar shows the cost. */}
                <span className="bg-secondary flex h-1.5 overflow-hidden rounded-full">
                  <span
                    className="bg-muted-foreground/60 block h-full"
                    style={{
                      width: `${Math.min(((preflight.data.used ?? 0) / Math.max(preflight.data.max ?? 1, 1)) * 100, 100)}%`,
                    }}
                  />
                  <span
                    className="bg-primary block h-full"
                    style={{
                      width: `${Math.min((recipients / Math.max(preflight.data.max ?? 1, 1)) * 100, 100)}%`,
                    }}
                  />
                </span>
                <span className="text-muted-foreground/70 text-[11.5px]">
                  {t("Uses {recipients} of {remaining} remaining", {
                    recipients: recipients.toLocaleString(),
                    remaining: remaining.toLocaleString(),
                  })}
                </span>
              </div>
            </>
          ) : null}
        </div>

        {exhausted ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12.5px] leading-snug">
            <IconAlertTriangle className="mt-px size-4 shrink-0" aria-hidden />
            {t("Your conversation allowance is fully used, so nothing would be delivered.")}
          </div>
        ) : shortfall > 0 ? (
          <div className="text-secondary-foreground flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] leading-snug dark:border-amber-900/50 dark:bg-amber-950/30">
            <IconAlertTriangle
              className="mt-px size-4 shrink-0 text-amber-700 dark:text-amber-500"
              aria-hidden
            />
            {t("{shortfall} recipients are beyond your allowance and will not be reached.", {
              shortfall,
            })}
          </div>
        ) : null}

        {alreadySent ? (
          <div className="bg-muted text-secondary-foreground rounded-lg px-3 py-2.5 text-[12.5px] leading-snug">
            {t(
              "This campaign has already been sent. Only the {count} recipients it has never messaged will be sent to — nobody is messaged twice.",
              { count: recipients.toLocaleString() },
            )}
          </div>
        ) : null}

        {wizard.canLaunch ? null : (
          <div className="bg-muted text-secondary-foreground rounded-lg px-3 py-2.5 text-[12.5px] leading-snug">
            {t("Add a template before launching — everything else is optional.")}
          </div>
        )}

        <Button
          size="lg"
          className="w-full"
          disabled={!wizard.canLaunch || exhausted || sendCampaign.isPending}
          onClick={() => void launch()}
        >
          <IconRocket className="size-4" aria-hidden />
          {alreadySent
            ? scheduled
              ? t("Schedule for {count} new recipients", { count: recipients.toLocaleString() })
              : t("Send to {count} new recipients", { count: recipients.toLocaleString() })
            : scheduled
              ? t("Schedule campaign")
              : t("Launch campaign")}
        </Button>

        {/* A rehearsal before spending the audience. Opens no send session and
            moves no counters, so it cannot skew the analytics afterwards. */}
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" className="w-full" disabled={!campaign.waTemplateId} />
            }
          >
            <IconSend className="size-4" aria-hidden />
            {t("Send test to me")}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (testPhoneIsValid) sendTest.mutate({ campaignId, phone: testPhone });
              }}
            >
              <Field>
                <FieldLabel htmlFor="campaign-test-phone">{t("Send a test to")}</FieldLabel>
                {/* The same country-picker input as every other number in the
                    product. A bare text field let a national number through with
                    no country code, which Meta accepts and delivers to nobody —
                    a test that appears to be sent and never arrives is worse than
                    no test at all. */}
                <PhoneInput
                  id="campaign-test-phone"
                  name="campaign-test-phone"
                  defaultCountry="IN"
                  international
                  countryCallingCodeEditable={false}
                  placeholder={t("Enter phone number")}
                  value={testPhone}
                  onChange={(value) => setTestPhone(value ?? "")}
                  className="w-full"
                />
                <FieldDescription>
                  {t("Sends the real template. It counts towards your allowance.")}
                </FieldDescription>
              </Field>
              <Button type="submit" disabled={!testPhoneIsValid || sendTest.isPending}>
                {sendTest.isPending ? t("Sending…") : t("Send test")}
              </Button>
            </form>
          </PopoverContent>
        </Popover>
        <span className="text-muted-foreground/70 text-center text-xs leading-relaxed">
          {t("Scheduled sends can be paused or cancelled until the first batch starts.")}
        </span>
      </aside>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  mono = false,
}: Readonly<{ label: string; value: string; mono?: boolean }>) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn("truncate text-right font-medium", mono && "font-mono text-[12.5px]")}>
        {value}
      </span>
    </div>
  );
}
