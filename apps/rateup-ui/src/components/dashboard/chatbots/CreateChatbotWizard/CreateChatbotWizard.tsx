import {
  IconBrandInstagram,
  IconBrandMessenger,
  IconBrandWhatsapp,
  IconPlus,
} from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useChannels } from "@/backend/channels/channels.query";
import { useCreateWaAutomatedReplyMutation } from "@/backend/whatsapp/automated-reply/automatedReply.query";
import { useCreateMetaAutomationMutation } from "@/backend/whatsapp/instagram-automation/instagramAutomation.query";
import { StepTransition } from "@/components/dashboard/loyalty/onboarding/StepChrome.tsx";
import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Stepper, type StepperStep } from "@/components/ui/stepper.tsx";
import { FlowbotPreviewPlayground } from "@/components/whatsapp/automation/components/flowbot-phone-preview.tsx";
import {
  CHATBOT_USE_CASES,
  examplesFor,
  findExample,
  type ChatbotExample,
  type ChatbotGraph,
  type ChatbotUseCase,
} from "@/config/chatbotExamples/index.ts";
import { cn } from "@/lib/utils.ts";
import { MessagePlatform } from "@/types/enums.ts";
import { AutomationPlatform } from "@/types/platform.ts";

import {
  firstStep,
  FROM_SCRATCH,
  isStepComplete,
  nextStep,
  previousStep,
  stepsFor,
  type WizardStep,
} from "./createChatbotWizard.steps.ts";

const CHANNELS = [
  {
    platform: AutomationPlatform.WHATSAPP,
    channel: MessagePlatform.WHATSAPP,
    label: "WhatsApp",
    blurb: "Menus, buttons and lists for customers who message your number.",
    icon: IconBrandWhatsapp,
    iconClass: "text-green-600 dark:text-green-500",
  },
  {
    platform: AutomationPlatform.INSTAGRAM,
    channel: MessagePlatform.INSTAGRAM,
    label: "Instagram",
    blurb: "DM replies, comment-to-DM and follower rewards.",
    icon: IconBrandInstagram,
    iconClass: "text-pink-600 dark:text-pink-500",
  },
  {
    platform: AutomationPlatform.FACEBOOK,
    channel: MessagePlatform.FACEBOOK,
    label: "Messenger",
    blurb: "Answers for people who message your Facebook Page.",
    icon: IconBrandMessenger,
    iconClass: "text-blue-600 dark:text-blue-500",
  },
] as const;

/** Where each platform's editor lives. */
const EDITOR_PATH: Record<AutomationPlatform, string> = {
  [AutomationPlatform.WHATSAPP]: "/dashboard/whatsapp/flowbots",
  [AutomationPlatform.INSTAGRAM]: "/dashboard/instagram/flowbots",
  [AutomationPlatform.FACEBOOK]: "/dashboard/messenger/flowbots",
};

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
 * then its name. Opened from a channel's own page, the channel is fixed and its step skipped.
 */
export function CreateChatbotWizard({
  open,
  onClose,
  platform: fixedPlatform,
  initialExample,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  /** Set when opened from a channel's page. */
  platform?: AutomationPlatform;
  /** An example key to arrive with already chosen, on the starting-point step. */
  initialExample?: string;
}>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const channelFixed = Boolean(fixedPlatform);

  const [step, setStep] = useState<WizardStep>(firstStep(channelFixed));
  const [platform, setPlatform] = useState<AutomationPlatform | undefined>(fixedPlatform);
  const [start, setStart] = useState<string | undefined>(initialExample);
  const [name, setName] = useState(findExample(initialExample)?.name ?? "");
  const [accountId, setAccountId] = useState<string | undefined>();

  const createWa = useCreateWaAutomatedReplyMutation();
  const createMeta = useCreateMetaAutomationMutation(
    platform && platform !== AutomationPlatform.WHATSAPP ? platform : AutomationPlatform.INSTAGRAM,
  );
  const isCreating = createWa.isPending || createMeta.isPending;

  const example = findExample(start);
  const selection = { platform, start, name };

  const close = () => {
    setStep(firstStep(channelFixed));
    setPlatform(fixedPlatform);
    setStart(undefined);
    setName("");
    setAccountId(undefined);
    onClose();
  };

  const choosePlatform = (next: AutomationPlatform) => {
    if (next === platform) return;
    setPlatform(next);
    setStart(undefined);
    setName("");
    setAccountId(undefined);
  };

  const chooseStart = (next: string) => {
    setStart(next);
    // Prefill the name from the example, unless the user has typed their own.
    const previous = findExample(start)?.name ?? "";
    if (!name || name === previous) setName(findExample(next)?.name ?? "");
  };

  const path = stepsFor(channelFixed);
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
  const forward = nextStep(channelFixed, step);
  const back = previousStep(channelFixed, step);

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
    };
    const open = (id: string | undefined) => {
      close();
      if (!id) return;
      void navigate({
        to: `${EDITOR_PATH[platform]}/${id}`,
        search: {
          ...(example?.suggestedTrigger && { example: example.key }),
          ...(example?.suggestedTrigger && accountId && { channel: accountId }),
        },
      });
    };

    if (platform === AutomationPlatform.WHATSAPP) {
      createWa.mutate(body, { onSuccess: (created) => open(created?.id) });
    } else {
      createMeta.mutate(body, { onSuccess: (created) => open(created?.data?.id) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{t("Create Chatbot")}</DialogTitle>
          <DialogDescription>
            {t(
              "Start from a ready-made example or a blank canvas. You can change everything later.",
            )}
          </DialogDescription>
        </DialogHeader>

        <Stepper steps={rail} currentStep={step} className="py-2" />

        {step === "channel" && (
          <StepTransition stepKey="channel">
            <ChannelStep value={platform} onChange={choosePlatform} />
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={close}>
                {t("Cancel")}
              </Button>
              <Button
                type="button"
                disabled={!isStepComplete("channel", selection) || !forward}
                onClick={() => forward && setStep(forward)}
              >
                {t("Next")}
              </Button>
            </DialogFooter>
          </StepTransition>
        )}

        {step === "start" && platform && (
          <StepTransition stepKey="start">
            <StartStep platform={platform} value={start} onChange={chooseStart} />
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => (back ? setStep(back) : close())}
              >
                {back ? t("Back") : t("Cancel")}
              </Button>
              <Button
                type="button"
                disabled={!isStepComplete("start", selection) || !forward}
                onClick={() => forward && setStep(forward)}
              >
                {t("Next")}
              </Button>
            </DialogFooter>
          </StepTransition>
        )}

        {step === "details" && platform && (
          <StepTransition stepKey="details">
            <DetailsStep
              platform={platform}
              example={example}
              name={name}
              onNameChange={setName}
              accountId={accountId}
              onAccountChange={setAccountId}
            />
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => back && setStep(back)}>
                {t("Back")}
              </Button>
              <Button
                type="button"
                loading={isCreating}
                disabled={!isStepComplete("details", selection)}
                onClick={handleCreate}
              >
                {t("Create Chatbot")}
              </Button>
            </DialogFooter>
          </StepTransition>
        )}
      </DialogContent>
    </Dialog>
  );
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
    <div role="radiogroup" aria-label={t("Channel")} className="grid gap-3 sm:grid-cols-3">
      {CHANNELS.map((option) => {
        const Icon = option.icon;
        const connected = channels?.some((channel) => channel.platform === option.channel);
        const isSelected = value === option.platform;

        if (!isPending && !connected) {
          return (
            <div
              key={option.platform}
              className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-4"
            >
              <Icon className={cn("size-6", option.iconClass)} aria-hidden />
              <span className="font-medium text-foreground">{option.label}</span>
              <p className="text-sm text-muted-foreground">{t("No account connected yet.")}</p>
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
                {t("Connect")}
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
            className={cn(
              "flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
              "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected ? "border-primary bg-primary/5" : "border-border bg-card",
            )}
          >
            <Icon className={cn("size-6", option.iconClass)} aria-hidden />
            <span className="font-medium text-foreground">{option.label}</span>
            <p className="text-sm text-muted-foreground">{t(option.blurb)}</p>
          </button>
        );
      })}
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

  const all = examplesFor(platform);
  const chips = CHATBOT_USE_CASES.filter((chip) => all.some((ex) => ex.useCase === chip.value));
  const shown = useCase ? all.filter((ex) => ex.useCase === useCase) : all;
  const selected = findExample(value);
  // One graph per selection, so the preview does not restart on every render.
  const preview = useMemo(() => selected?.build(), [selected]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_17rem]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
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
          className="grid gap-2 sm:grid-cols-2"
        >
          <StartCard
            selected={value === FROM_SCRATCH}
            onSelect={() => onChange(FROM_SCRATCH)}
            title={t("Start from scratch")}
            description={t("A blank canvas with just the start step.")}
            icon={<IconPlus className="size-4" aria-hidden />}
          />
          {shown.map((example) => (
            <StartCard
              key={example.key}
              selected={value === example.key}
              onSelect={() => onChange(example.key)}
              title={t(example.name)}
              description={t(example.description)}
              badge={t(CHATBOT_USE_CASES.find((c) => c.value === example.useCase)?.label ?? "")}
            />
          ))}
        </div>
      </div>

      <div className="hidden h-105 overflow-hidden rounded-xl border border-border lg:block">
        {preview ? (
          <FlowbotPreviewPlayground
            key={selected?.key}
            nodes={preview.nodes}
            edges={preview.edges}
            platform={platform}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {t("Pick an example to see it in action.")}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: Readonly<{ active: boolean; onClick: () => void; children: React.ReactNode }>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-muted/60",
      )}
    >
      {children}
    </button>
  );
}

function StartCard({
  selected,
  onSelect,
  title,
  description,
  badge,
  icon,
}: Readonly<{
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  badge?: string;
  icon?: React.ReactNode;
}>) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors",
        "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary bg-primary/5" : "border-border bg-card",
      )}
    >
      <span className="flex items-center gap-2 font-medium text-foreground">
        {icon}
        {title}
      </span>
      <span className="text-sm text-muted-foreground">{description}</span>
      {badge && (
        <Badge variant="secondary" className="w-fit">
          {badge}
        </Badge>
      )}
    </button>
  );
}

/* ── step 3: details ─────────────────────────────────────────────────────────── */

function DetailsStep({
  platform,
  example,
  name,
  onNameChange,
  accountId,
  onAccountChange,
}: Readonly<{
  platform: AutomationPlatform;
  example: ChatbotExample | undefined;
  name: string;
  onNameChange: (next: string) => void;
  accountId: string | undefined;
  onAccountChange: (next: string | undefined) => void;
}>) {
  const { t } = useTranslation();
  const channel = CHANNELS.find((option) => option.platform === platform)!;
  const tooShort = name.length > 0 && name.trim().length < 3;

  return (
    <FieldGroup className="gap-4">
      <Field data-invalid={tooShort}>
        <FieldLabel htmlFor="chatbot-name">{t("Chatbot Name")}</FieldLabel>
        <Input
          id="chatbot-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={t("e.g. Welcome Bot, Support Bot...")}
          aria-invalid={tooShort}
          autoFocus
        />
        <FieldDescription>
          {tooShort
            ? t("Name must be at least 3 characters")
            : t("Give this bot a clear internal name.")}
        </FieldDescription>
      </Field>

      <Field>
        <AccountSelector
          label={t("Account")}
          platform={channel.channel}
          optional
          value={accountId}
          onChange={onAccountChange}
        />
        <FieldDescription>
          {platform === AutomationPlatform.WHATSAPP
            ? t("Only needed when the flow sends messages from a specific WhatsApp number.")
            : t("Optional. Used to set up the rule that starts this chatbot.")}
        </FieldDescription>
      </Field>

      <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
        <span className="font-medium text-foreground">{t("How it starts")}: </span>
        <span className="text-muted-foreground">
          {example?.suggestedTrigger
            ? t(example.suggestedTrigger.hint)
            : t("Add a rule in Automation that triggers this chatbot.")}
        </span>
      </div>
    </FieldGroup>
  );
}
