import { Button } from "@rateup/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@rateup/ui/components/dialog";
import { Field, FieldDescription, FieldLabel } from "@rateup/ui/components/field";
import { Input } from "@rateup/ui/components/input";
import {
  IconBolt,
  IconBrandInstagram,
  IconBrandMessenger,
  IconBrandWhatsapp,
  IconCalendar,
  IconCheck,
  IconHeadset,
  IconHelpCircle,
  IconListCheck,
  IconMessageCircle,
  IconPlus,
  IconShoppingBag,
  IconThumbUp,
  IconTrendingUp,
  IconUserPlus,
  type Icon,
} from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { Channel } from "@/backend/channels/channels.api";
import { useChannels } from "@/backend/channels/channels.query";
import { useCreateChatbotMutation } from "@/backend/chatbots/chatbots.query.ts";
import { StepTransition } from "@/components/dashboard/loyalty/onboarding/StepChrome.tsx";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { Stepper, type StepperStep } from "@/components/ui/stepper.tsx";
import { FlowbotPreviewPlayground } from "@/components/whatsapp/automation/components/flowbot-phone-preview.tsx";
import {
  CHATBOT_USE_CASES,
  examplesFor,
  findExample,
  findTrigger,
  triggerOptionsFor,
  type ChatbotExample,
  type ChatbotGraph,
  type ChatbotTriggerKind,
  type ChatbotUseCase,
} from "@/config/chatbotExamples/index.ts";
import { cn } from "@/lib/utils.ts";
import { MessagePlatform } from "@/types/enums.ts";
import { AutomationPlatform } from "@/types/platform.ts";

import {
  FROM_SCRATCH,
  isStepComplete,
  nextStep,
  previousStep,
  WIZARD_STEPS,
  type WizardStep,
} from "./createChatbotWizard.steps.ts";

interface ChannelOption {
  platform: AutomationPlatform;
  channel: MessagePlatform;
  label: string;
  /** Sets the `ch-*` colours for everything inside (see foundation.css). */
  colorClass: string;
  icon: Icon;
  blurb: string;
  /** What only this channel can do, listed on its card. */
  only: string[];
  accountLabel: string;
  accountHint: string;
  /** Under the preview: how this app shows choices. */
  previewNote: string;
}

const CHANNELS: readonly ChannelOption[] = [
  {
    platform: AutomationPlatform.WHATSAPP,
    channel: MessagePlatform.WHATSAPP,
    label: "WhatsApp",
    colorClass: "channel-whatsapp",
    icon: IconBrandWhatsapp,
    blurb: "Menus, buttons and lists for customers who message your number.",
    only: [
      "Reply buttons and lists",
      "Catalog and products",
      "Forms (WhatsApp Flows)",
      "Location and contact cards",
    ],
    accountLabel: "WhatsApp number",
    accountHint: "Only needed when the flow sends messages from a specific WhatsApp number.",
    previewNote:
      "Reply buttons sit inside the message, up to 3. Lists open a menu of up to 10 rows.",
  },
  {
    platform: AutomationPlatform.INSTAGRAM,
    channel: MessagePlatform.INSTAGRAM,
    label: "Instagram",
    colorClass: "channel-instagram",
    icon: IconBrandInstagram,
    blurb: "DM replies, comment-to-DM, story mentions and follower rewards.",
    only: [
      "Comment on a post or reel → DM",
      "Story mention replies",
      "Follow-to-unlock check",
      "Product cards",
    ],
    accountLabel: "Instagram account",
    accountHint: "The account whose DMs and comments start this journey.",
    previewNote:
      "Quick replies show as chips under the message, up to 13. Cards swipe sideways, up to 10.",
  },
  {
    platform: AutomationPlatform.FACEBOOK,
    channel: MessagePlatform.FACEBOOK,
    label: "Messenger",
    colorClass: "channel-messenger",
    icon: IconBrandMessenger,
    blurb: "Answers for people who message or comment on your Facebook Page.",
    only: ["Get Started button", "Page comment → private reply", "m.me link campaigns"],
    accountLabel: "Facebook Page",
    accountHint: "The Page whose messages and comments start this journey.",
    previewNote:
      "Quick replies show as chips under the message, up to 13. Cards swipe sideways, up to 10.",
  },
];

const USE_CASE_ICON: Record<ChatbotUseCase, Icon> = {
  welcome: IconMessageCircle,
  support: IconHelpCircle,
  leads: IconUserPlus,
  sales: IconShoppingBag,
  bookings: IconCalendar,
  feedback: IconThumbUp,
  qualification: IconListCheck,
  growth: IconTrendingUp,
  handoff: IconHeadset,
};

const PREVIEW_PLATFORM = {
  [AutomationPlatform.WHATSAPP]: "whatsapp",
  [AutomationPlatform.INSTAGRAM]: "instagram",
  [AutomationPlatform.FACEBOOK]: "facebook",
} as const;

function channelOf(platform: AutomationPlatform) {
  return CHANNELS.find((option) => option.platform === platform)!;
}

/** A blank chatbot: the start node and nothing else, as the old create form made it. */
function scratchGraph(): ChatbotGraph {
  return {
    nodes: [
      {
        id: `startNode-${Date.now()}`,
        type: "startNode",
        position: { x: 225, y: 45 },
        data: { label: "Start" },
      },
    ],
    edges: [],
  };
}

/**
 * Creating a chatbot on any channel: which channel, a ready-made example or a blank start,
 * then its name, account and how it starts. Opened from a list filtered to one channel, that
 * channel is picked already but can still be changed. The chosen channel's colour marks
 * what is selected; buttons and the steps stay in the brand colour.
 */
export function CreateChatbotWizard({
  open,
  onClose,
  initialPlatform,
  initialExample,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  /** The channel picked when the wizard opens. */
  initialPlatform?: AutomationPlatform;
  /** An example key to arrive with already chosen; with a channel, opens on the starting point. */
  initialExample?: string;
}>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openingStep: WizardStep = initialPlatform && initialExample ? "start" : "channel";

  const [step, setStep] = useState<WizardStep>(openingStep);
  const [platform, setPlatform] = useState<AutomationPlatform | undefined>(initialPlatform);
  const [start, setStart] = useState<string | undefined>(initialExample);
  const [name, setName] = useState(findExample(initialExample)?.name ?? "");
  const [accountId, setAccountId] = useState<string | undefined>();
  // Undefined until the user picks one: until then it follows the starting point's own.
  const [triggerChoice, setTriggerChoice] = useState<ChatbotTriggerKind | undefined>();

  const create = useCreateChatbotMutation();
  const isCreating = create.isPending;

  const example = findExample(start);
  const trigger = platform
    ? (findTrigger(platform, triggerChoice ?? example?.trigger) ?? triggerOptionsFor(platform)[0])
    : undefined;
  const selection = { platform, start, name };
  const channel = platform ? channelOf(platform) : undefined;

  const close = () => {
    setStep(openingStep);
    setPlatform(initialPlatform);
    setStart(undefined);
    setName("");
    setAccountId(undefined);
    setTriggerChoice(undefined);
    onClose();
  };

  const choosePlatform = (next: AutomationPlatform) => {
    if (next === platform) return;
    setPlatform(next);
    setStart(undefined);
    setName("");
    setAccountId(undefined);
    setTriggerChoice(undefined);
  };

  const chooseStart = (next: string) => {
    setStart(next);
    setTriggerChoice(undefined);
    // Prefill the name from the example, unless the user has typed their own.
    const previous = findExample(start)?.name ?? "";
    if (!name || name === previous) setName(findExample(next)?.name ?? "");
  };

  const path = WIZARD_STEPS;
  const stepLabel: Record<WizardStep, string> = {
    channel: t("Channel"),
    start: t("Starting point"),
    details: t("Details"),
  };
  const rail: StepperStep[] = path.map((id) => ({
    id,
    label: stepLabel[id],
    complete: path.indexOf(id) < path.indexOf(step),
  }));
  const forward = nextStep(step);
  const back = previousStep(step);

  const handleCreate = () => {
    if (!platform) return;
    const graph = example ? example.build() : scratchGraph();
    const body = {
      name: name.trim(),
      platform,
      matchData: {
        json: { ...graph, viewport: { x: 0, y: 0, zoom: 1 } },
        caseSensitive: false,
      },
      // Only WhatsApp chatbots keep a number; on the other channels the rule picks the account.
      whatsappSettingsPhoneId:
        platform === AutomationPlatform.WHATSAPP ? (accountId ?? null) : null,
      // The API makes the rule that starts it, switched off until the editor turns it on.
      ...(trigger && {
        start: { kind: trigger.kind, accountId: accountId ?? null },
      }),
    };
    create.mutate(body, {
      onSuccess: ({ chatbot: created, startRule }) => {
        if (startRule?.skipped === "failed") {
          toast.warning(
            t("The journey was created, but its rule wasn't. Set it up in the builder."),
          );
        } else if (startRule?.skipped === "no_account") {
          toast.warning(t("No account is connected on this channel yet, so no rule was made."));
        }
        close();
        void navigate({
          to: "/dashboard/automation/journeys/$journeyId",
          params: { journeyId: created.id },
          search: {
            ...(trigger && { trigger: trigger.kind }),
            ...(example && { example: example.key }),
            ...(accountId && { channel: accountId }),
          },
        });
      },
    });
  };

  const startTitle =
    start === FROM_SCRATCH ? t("Start from scratch") : example ? t(example.name) : undefined;
  const summary = [
    channel && t(channel.label),
    step !== "channel" && startTitle,
    step === "details" && trigger && t(trigger.label),
  ]
    .filter(Boolean)
    .join(" · ");

  const showPreview = step !== "channel" && platform;
  const canAdvance = isStepComplete(step, selection);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        className={cn(
          "flex h-[min(46rem,92dvh)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl",
          channel?.colorClass,
        )}
      >
        <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-b border-border py-4 pl-6 pr-12">
          <div className="min-w-0 flex-1">
            <DialogTitle className="font-display text-lg font-semibold">
              {t("Create journey")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t(
                "Start from a ready-made example or a blank canvas. You can change everything later.",
              )}
            </DialogDescription>
          </div>
          <Stepper steps={rail} currentStep={step} className="w-full sm:w-auto" />
        </div>

        <div
          className={cn("grid min-h-0 flex-1", showPreview && "lg:grid-cols-[minmax(0,1fr)_19rem]")}
        >
          <div className="min-h-0 overflow-y-auto">
            {step === "channel" && (
              <StepTransition stepKey="channel">
                <ChannelStep value={platform} onChange={choosePlatform} />
              </StepTransition>
            )}
            {step === "start" && platform && (
              <StepTransition stepKey="start">
                <StartStep platform={platform} value={start} onChange={chooseStart} />
              </StepTransition>
            )}
            {step === "details" && platform && channel && trigger && (
              <StepTransition stepKey="details">
                <DetailsStep
                  channel={channel}
                  startTitle={startTitle ?? ""}
                  onChangeStart={() => setStep("start")}
                  name={name}
                  onNameChange={setName}
                  accountId={accountId}
                  onAccountChange={setAccountId}
                  trigger={trigger.kind}
                  onTriggerChange={setTriggerChoice}
                />
              </StepTransition>
            )}
          </div>

          {showPreview && channel && (
            <ChatPreview
              channel={channel}
              example={example}
              context={trigger?.context ? t(trigger.context) : undefined}
            />
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-border px-6 py-3">
          <p className="min-w-0 truncate text-xs text-muted-foreground">{summary}</p>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => (back ? setStep(back) : close())}
            >
              {back ? t("Back") : t("Cancel")}
            </Button>
            {step === "details" ? (
              <Button
                type="button"
                loading={isCreating}
                disabled={!canAdvance}
                onClick={handleCreate}
              >
                {t("Create journey")}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!canAdvance || !forward}
                onClick={() => forward && setStep(forward)}
              >
                {t("Next")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── shared bits ─────────────────────────────────────────────────────────────── */

/** The round tick on a selected card, in the channel's colour. */
function SelectedTick({ className }: Readonly<{ className?: string }>) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4.5 shrink-0 items-center justify-center rounded-full bg-ch text-white",
        className,
      )}
    >
      <IconCheck className="size-3" stroke={3} />
    </span>
  );
}

/** A card's look: the channel's tint and ring when selected, a plain card otherwise. */
function selectable(selected: boolean) {
  return cn(
    "rounded-xl border text-left transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    selected ? "border-ch bg-ch-soft ring-1 ring-ch" : "border-border bg-card hover:bg-muted/60",
  );
}

/** Who is connected on a channel, in a few words for its card. */
function accountSummary(channels: Channel[] | undefined, option: ChannelOption, t: TFunction) {
  const mine = (channels ?? []).filter((channel) => channel.platform === option.channel);
  if (mine.length === 1) {
    const only = mine[0]!;
    return only.username ? `@${only.username}` : (only.name ?? "");
  }
  return t("{count, plural, one {# account connected} other {# accounts connected}}", {
    count: mine.length,
  });
}

/* ── step 1: channel ─────────────────────────────────────────────────────────── */

function ChannelStep({
  value,
  onChange,
}: Readonly<{
  value: AutomationPlatform | undefined;
  onChange: (next: AutomationPlatform) => void;
}>) {
  const { t } = useTranslation();
  const { data: channels, isPending } = useChannels();

  return (
    <div className="flex flex-col gap-5 px-6 py-6 sm:px-8">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          {t("Step 1")}
        </span>
        <h2 className="font-display text-base font-semibold text-foreground">
          {t("Where will this journey reply?")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(
            "Each channel has its own templates and message types. In the builder you only see the blocks that channel supports.",
          )}
        </p>
      </div>

      <div role="radiogroup" aria-label={t("Channel")} className="grid gap-3 md:grid-cols-3">
        {CHANNELS.map((option) => {
          const Icon = option.icon;
          const connected = channels?.some((channel) => channel.platform === option.channel);
          const isSelected = value === option.platform;

          if (!isPending && !connected) {
            return (
              <div
                key={option.platform}
                className="flex flex-col gap-3 rounded-xl border border-dashed border-input bg-muted/40 p-4"
              >
                <span className="flex items-center gap-2.5">
                  <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="font-display font-semibold text-foreground">
                    {t(option.label)}
                  </span>
                </span>
                <p className="text-xs text-muted-foreground">
                  {t("No account connected yet. Connect one to build journeys for {channel}.", {
                    channel: t(option.label),
                  })}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-auto w-fit"
                  render={
                    <Link
                      to="/dashboard/settings/channels/$channel"
                      params={{ channel: option.platform }}
                    />
                  }
                >
                  {t("Connect {channel}", { channel: t(option.label) })}
                </Button>
              </div>
            );
          }

          return (
            <button
              key={option.platform}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={isPending}
              onClick={() => onChange(option.platform)}
              className={cn(option.colorClass, selectable(isSelected), "flex flex-col gap-3 p-4")}
            >
              <span className="flex items-center gap-2.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ch text-white">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-display font-semibold text-foreground">
                    {t(option.label)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {isPending ? " " : accountSummary(channels, option, t)}
                  </span>
                </span>
                {isSelected && <SelectedTick />}
              </span>
              <span className="text-xs text-muted-foreground">{t(option.blurb)}</span>
              <span className="flex flex-col gap-1.5 border-t border-border pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {t("Only on {channel}", { channel: t(option.label) })}
                </span>
                {option.only.map((feature) => (
                  <span
                    key={feature}
                    className="flex items-center gap-2 text-xs text-secondary-foreground"
                  >
                    <IconCheck className="size-3.5 shrink-0 text-ch" aria-hidden />
                    {t(feature)}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {t(
          "Text, images, video, audio, questions, pauses and handing over to your team work on every channel.",
        )}
      </p>
    </div>
  );
}

/* ── step 2: starting point ──────────────────────────────────────────────────── */

function StartStep({
  platform,
  value,
  onChange,
}: Readonly<{
  platform: AutomationPlatform;
  value: string | undefined;
  onChange: (next: string) => void;
}>) {
  const { t } = useTranslation();
  const [useCase, setUseCase] = useState<ChatbotUseCase | undefined>(findExample(value)?.useCase);
  const channel = channelOf(platform);
  const ChannelIcon = channel.icon;

  const all = examplesFor(platform);
  const chips = CHATBOT_USE_CASES.filter((chip) => all.some((ex) => ex.useCase === chip.value));
  const shown = useCase ? all.filter((ex) => ex.useCase === useCase) : all;
  const useCaseLabel = (value: ChatbotUseCase) =>
    t(CHATBOT_USE_CASES.find((c) => c.value === value)?.label ?? "");

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-ch pl-2 pr-2.5 text-xs font-medium text-white">
          <ChannelIcon className="size-3.5" aria-hidden />
          {t(channel.label)}
        </span>
        <span aria-hidden className="mx-1 h-4.5 w-px bg-border" />
        <Chip active={!useCase} onClick={() => setUseCase(undefined)}>
          {t("All")}
        </Chip>
        {chips.map((chip) => (
          <Chip
            key={chip.value}
            active={useCase === chip.value}
            onClick={() => setUseCase(chip.value)}
          >
            {t(chip.label)}
          </Chip>
        ))}
      </div>

      <div
        role="radiogroup"
        aria-label={t("Starting point")}
        className="grid gap-2.5 sm:grid-cols-2"
      >
        <button
          type="button"
          role="radio"
          aria-checked={value === FROM_SCRATCH}
          onClick={() => onChange(FROM_SCRATCH)}
          className={cn(
            selectable(value === FROM_SCRATCH),
            "flex items-center gap-3 p-3 sm:col-span-2",
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-input text-secondary-foreground">
            <IconPlus className="size-4" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{t("Start from scratch")}</span>
            <span className="text-xs text-muted-foreground">
              {t("A blank {channel} journey with just the start step.", {
                channel: t(channel.label),
              })}
            </span>
          </span>
          {value === FROM_SCRATCH && <SelectedTick />}
        </button>

        {shown.map((example) => (
          <TemplateCard
            key={example.key}
            example={example}
            selected={value === example.key}
            onSelect={() => onChange(example.key)}
            useCaseLabel={useCaseLabel(example.useCase)}
            triggerLabel={t(findTrigger(platform, example.trigger)?.label ?? "")}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({
  example,
  selected,
  onSelect,
  useCaseLabel,
  triggerLabel,
}: Readonly<{
  example: ChatbotExample;
  selected: boolean;
  onSelect: () => void;
  useCaseLabel: string;
  triggerLabel: string;
}>) {
  const { t } = useTranslation();
  const Icon = USE_CASE_ICON[example.useCase];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(selectable(selected), "relative flex flex-col gap-1.5 p-3")}
    >
      <span className="flex min-w-0 items-center gap-2 pr-6">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-ch-border bg-ch-soft text-ch-fg">
          <Icon className="size-3.5" aria-hidden />
        </span>
        <span className="truncate text-sm font-medium text-foreground">{t(example.name)}</span>
        {example.isNew && (
          <span className="shrink-0 rounded-full border border-ru-amber-200 bg-ru-amber-50 px-2 text-xs font-medium text-ru-amber-700">
            {t("New")}
          </span>
        )}
      </span>
      <span className="text-xs text-muted-foreground">{t(example.description)}</span>
      <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {useCaseLabel}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-ru-blue-200 bg-ru-blue-50 px-2 py-0.5 text-xs font-medium text-ru-blue-600">
          <IconBolt className="size-3" aria-hidden />
          {triggerLabel}
        </span>
      </span>
      {selected && <SelectedTick className="absolute right-3 top-3.5" />}
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: Readonly<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-7 rounded-full border px-2.5 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-ch-border bg-ch-soft text-ch-fg"
          : "border-border bg-card text-muted-foreground hover:bg-muted/60",
      )}
    >
      {children}
    </button>
  );
}

/* ── the preview ─────────────────────────────────────────────────────────────── */

function ChatPreview({
  channel,
  example,
  context,
}: Readonly<{
  channel: ChannelOption;
  example: ChatbotExample | undefined;
  context?: string;
}>) {
  const { t } = useTranslation();
  // One graph per example, so the preview does not restart on every render.
  const graph = useMemo(() => example?.build(), [example]);

  return (
    <aside
      aria-label={t("Preview")}
      className="hidden min-h-0 flex-col gap-2.5 border-l border-border bg-muted/50 p-4 lg:flex"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
        {t("Preview · {channel}", { channel: t(channel.label) })}
      </span>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {graph ? (
          <FlowbotPreviewPlayground
            // A new example or start replays the conversation from the top.
            key={`${example?.key}-${context ?? ""}`}
            nodes={graph.nodes}
            edges={graph.edges}
            platform={PREVIEW_PLATFORM[channel.platform]}
            context={context}
            autoStart
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {t("Pick an example to see it in action. A blank journey starts with no messages.")}
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground">{t(channel.previewNote)}</span>
    </aside>
  );
}

/* ── step 3: details ─────────────────────────────────────────────────────────── */

function DetailsStep({
  channel,
  startTitle,
  onChangeStart,
  name,
  onNameChange,
  accountId,
  onAccountChange,
  trigger,
  onTriggerChange,
}: Readonly<{
  channel: ChannelOption;
  startTitle: string;
  onChangeStart: () => void;
  name: string;
  onNameChange: (next: string) => void;
  accountId: string | undefined;
  onAccountChange: (next: string | undefined) => void;
  trigger: ChatbotTriggerKind;
  onTriggerChange: (next: ChatbotTriggerKind) => void;
}>) {
  const { t } = useTranslation();
  const tooShort = name.length > 0 && name.trim().length < 3;
  const ChannelIcon = channel.icon;

  return (
    <div className="flex flex-col gap-5 px-6 py-6 sm:px-7">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-ch text-white">
          <ChannelIcon className="size-4" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs text-muted-foreground">
            {t("{channel} · Starting point", { channel: t(channel.label) })}
          </span>
          <span className="truncate text-sm font-medium text-foreground">{startTitle}</span>
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={onChangeStart}>
          {t("Change")}
        </Button>
      </div>

      <Field data-invalid={tooShort}>
        <FieldLabel htmlFor="chatbot-name">{t("Journey Name")}</FieldLabel>
        <Input
          id="chatbot-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={t("e.g. Welcome journey, Support journey...")}
          aria-invalid={tooShort}
          autoFocus
        />
        <FieldDescription>
          {tooShort
            ? t("Name must be at least 3 characters")
            : t("Give this journey a clear internal name.")}
        </FieldDescription>
      </Field>

      <Field>
        <AccountSelector
          label={t(channel.accountLabel)}
          platform={channel.channel}
          optional
          value={accountId}
          onChange={onAccountChange}
        />
        <FieldDescription>{t(channel.accountHint)}</FieldDescription>
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-sm font-medium text-foreground">{t("How it starts")}</legend>
        <div
          role="radiogroup"
          aria-label={t("How it starts")}
          className="grid gap-2 sm:grid-cols-2"
        >
          {triggerOptionsFor(channel.platform).map((option) => {
            const isSelected = option.kind === trigger;
            return (
              <button
                key={option.kind}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onTriggerChange(option.kind)}
                className={cn(
                  selectable(isSelected),
                  "flex items-start gap-2.5 rounded-lg px-3 py-2.5",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 size-4 shrink-0 rounded-full border bg-card",
                    isSelected ? "border-[5px] border-ch" : "border-input",
                  )}
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{t(option.label)}</span>
                  <span className="text-xs text-muted-foreground">{t(option.description)}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex items-start gap-2.5 rounded-lg border border-ru-blue-200 bg-ru-blue-50 p-3">
          <IconBolt className="mt-0.5 size-4 shrink-0 text-ru-blue-600" aria-hidden />
          <span className="text-xs text-secondary-foreground">
            {trigger === "leadad"
              ? t("A lead ad starts this journey from its Lead ad block, so no rule is needed.")
              : t(
                  "We create the rule for you, switched off until you turn it on in the builder. You can fine-tune it in Automation later.",
                )}
          </span>
        </div>
      </fieldset>
    </div>
  );
}
