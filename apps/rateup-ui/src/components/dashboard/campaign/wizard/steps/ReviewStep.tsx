import {
  IconAlertTriangle,
  IconLoader2,
  IconPencil,
  IconRocket,
  IconSearch,
  IconSend,
} from "@tabler/icons-react";
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
import { useContacts } from "@/backend/campaign/contacts/contacts.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import useTemplatesAvailableForTeam from "@/hooks/team.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";
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
  // The contact the number was picked from, shown so the sender can see who
  // gets the test. Cleared as soon as the number is edited by hand.
  const [testContact, setTestContact] = useState<{ name: string; phone: string } | null>(null);
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
  // What the launch actually spends. A drip sends its whole sequence to each
  // recipient, so the allowance line has to count messages, not people — showing
  // the audience size there told a 3-stage drip to 50 people it cost 50.
  const messagesPerRecipient = preflight.data?.messagesPerRecipient ?? 1;
  const messages = recipients * messagesPerRecipient;
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
                    {t("{count} left", { count: Math.max(remaining - messages, 0) })}
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
                      width: `${Math.min((messages / Math.max(preflight.data.max ?? 1, 1)) * 100, 100)}%`,
                    }}
                  />
                </span>
                <span className="text-muted-foreground/70 text-[11.5px]">
                  {messagesPerRecipient > 1
                    ? t("Uses {messages} of {remaining} remaining — {stages} stages each", {
                        messages: messages.toLocaleString(),
                        remaining: remaining.toLocaleString(),
                        stages: messagesPerRecipient,
                      })
                    : t("Uses {recipients} of {remaining} remaining", {
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
          <PopoverContent align="end" className="w-80">
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (testPhoneIsValid) sendTest.mutate({ campaignId, phone: testPhone });
              }}
            >
              <Field>
                <FieldLabel htmlFor="campaign-test-phone">{t("Send a test to")}</FieldLabel>
                <TestContactSearch
                  onPick={(contact) => {
                    const phone = toE164(contact.phone);
                    setTestPhone(phone);
                    setTestContact({ name: contact.name || contact.phone, phone });
                  }}
                />
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
                  onChange={(value) => {
                    setTestPhone(value ?? "");
                    if (digitsOf(value ?? "") !== digitsOf(testContact?.phone ?? "")) {
                      setTestContact(null);
                    }
                  }}
                  className="w-full"
                />
                {testContact ? (
                  testPhoneIsValid ? (
                    <FieldDescription>
                      {t("Sending to {name}", { name: testContact.name })}
                    </FieldDescription>
                  ) : (
                    <FieldDescription className="text-amber-700 dark:text-amber-500">
                      {t("{name}'s number has no country code. Fix it above to send.", {
                        name: testContact.name,
                      })}
                    </FieldDescription>
                  )
                ) : null}
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

const digitsOf = (phone: string) => phone.replace(/\D/g, "");

/**
 * Contacts store numbers however they arrived — the WhatsApp webhook writes a
 * wa_id with the country code but no "+". The picker wants E.164, so add the
 * "+" back; a number saved without its country code then fails validation and
 * the form says so, rather than sending to the wrong country.
 */
const toE164 = (phone: string) => `+${digitsOf(phone)}`;

const TEST_CONTACT_PAGE = { pageIndex: 0, pageSize: 5 };

/** Fills the test number from a contact the org already has. */
function TestContactSearch({
  onPick,
}: Readonly<{ onPick: (contact: { name: string; phone: string }) => void }>) {
  const { t } = useTranslation("campaign.wizard");
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  // A number is matched as a substring of the stored one, which may not carry
  // the "+" or the spacing the sender typed — so search a number by its digits.
  const term = /^[\d\s()+-]+$/.test(trimmed) ? digitsOf(trimmed) : trimmed;
  const debounced = useDebounce(term, 300);
  const { data, isFetching } = useContacts(
    TEST_CONTACT_PAGE,
    debounced,
    undefined,
    undefined,
    undefined,
    debounced.length > 0,
  );
  const contacts = (data?.users ?? []).filter((contact) => Boolean(contact.phone));

  return (
    <div className="flex flex-col gap-1.5">
      <InputGroup>
        <InputGroupAddon>
          {isFetching ? (
            <IconLoader2 className="animate-spin" size={16} aria-hidden />
          ) : (
            <IconSearch size={16} aria-hidden />
          )}
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("Search contacts by name or number")}
          aria-label={t("Search contacts by name or number")}
          autoComplete="off"
          inputMode="search"
        />
      </InputGroup>

      {debounced && !isFetching && contacts.length === 0 ? (
        <span className="text-muted-foreground px-1 text-xs">
          {t("No contact matches “{query}”.", { query: debounced })}
        </span>
      ) : null}

      {debounced && contacts.length > 0 ? (
        <ul className="divide-border border-border bg-card flex flex-col divide-y rounded-lg border">
          {contacts.map((contact) => (
            <li key={contact.id}>
              <button
                type="button"
                onClick={() => {
                  onPick({ name: contact.name, phone: contact.phone });
                  setQuery("");
                }}
                className="hover:bg-muted flex w-full flex-col px-3 py-2 text-left"
              >
                <span className="text-foreground truncate text-[13px] font-medium">
                  {contact.name || t("No name")}
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">{contact.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <span className="text-muted-foreground px-1 text-xs">{t("or enter a number")}</span>
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
