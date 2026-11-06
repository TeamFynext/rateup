import { zodResolver } from "@hookform/resolvers/zod";
import { IconStar, IconMessage } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { type KeyboardEvent, useId, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod";

import { useTeamsByUser } from "@/backend/team/team.query";
import type { FlowTemplate } from "@/backend/whatsapp/flow/flow.api";
import { useCreateFlowMutation, useFlowTemplates } from "@/backend/whatsapp/flow/flow.query";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Stepper, type StepperStep } from "@/components/ui/stepper.tsx";
import { cn } from "@/lib/utils.ts";

import { FLOW_PURPOSES } from "../constants.tsx";
import { useFlowPurposeCopy } from "../flowPurposeCopy.ts";
import { FlowTemplatePreview } from "../FlowTemplatePreview.tsx";
import {
  hasTemplates,
  nextStep,
  previousStep,
  stepsFor,
  templateCategoryFor,
  type FlowType,
  type WizardStep,
} from "./createFlowWizard.steps.ts";

/**
 * Creating a WhatsApp Flow: what it is for, a ready-made start when there is one, then the
 * name, number and teams. Loyalty feedback flows get the RateUp category that Loyalty →
 * Feedback selects by, and one of the feedback surveys as their questions.
 */
export function CreateFlowWizard({
  open,
  onClose,
  initialType,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  /** Purpose to arrive with already chosen — Loyalty → Feedback links in this way. */
  initialType?: FlowType;
}>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>("type");
  // Read once: the wizard mounts with the page, and `?for=` is already in the URL on arrival.
  const [type, setType] = useState<FlowType | undefined>(initialType);
  const [templateChoice, setTemplateChoice] = useState<string | undefined>();

  const templates = useFlowTemplates(templateCategoryFor(type), open);
  const catalogue = templates.data;
  const create = useCreateFlowMutation();

  const close = () => {
    setStep("type");
    // The deep link is a one-shot hint, consumed on arrival. Holding on to it would reopen
    // every later "Create Flow" click on the loyalty tile, on a page where no purpose should
    // start ahead of the others.
    setType(undefined);
    setTemplateChoice(undefined);
    onClose();
  };

  const chooseType = (next: FlowType) => {
    if (next === type) return;
    setType(next);
    setTemplateChoice(undefined);
  };

  /**
   * The user's pick, else the suggestion for their programme, else the first. Derived rather
   * than copied into state by an effect: a key held in state outlived the catalogue it came
   * from, so switching away from loyalty feedback carried a templateKey into a flow that is
   * not a survey and the create call was rejected as an unknown template.
   */
  const templateKey = templateChoice ?? catalogue?.suggestedKey ?? catalogue?.templates[0]?.key;

  // The rail follows the purpose's own path, so it shows two circles for the eight purposes
  // that have no templates instead of a Template step they never visit.
  const path = stepsFor(type);
  const stepLabel: Record<WizardStep, string> = {
    type: t("What for"),
    template: t("Template"),
    details: t("Details"),
  };
  const rail: StepperStep[] = path.map((id) => ({
    id,
    label: stepLabel[id],
    complete: path.indexOf(id) < path.indexOf(step),
  }));

  const selectedTemplate = catalogue?.templates.find((tpl) => tpl.key === templateKey);
  const forward = nextStep(type, step);
  const back = previousStep(type, step);

  const onCreated = (id: unknown) => {
    close();
    if (typeof id === "string") {
      navigate({ to: "/dashboard/whatsapp/flows/v2/$dbFlowId", params: { dbFlowId: id } });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{t("Create Flow")}</DialogTitle>
          <DialogDescription>
            {t("A WhatsApp Flow is a form your customers fill in without leaving the chat.")}
          </DialogDescription>
        </DialogHeader>

        <Stepper steps={rail} currentStep={step} className="py-2" />

        {step === "type" && (
          <StepTransition stepKey="type">
            <PurposeStep value={type} onChange={chooseType} />
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={close}>
                {t("Cancel")}
              </Button>
              <Button
                type="button"
                disabled={!type || !forward}
                onClick={() => forward && setStep(forward)}
              >
                {t("Next")}
              </Button>
            </DialogFooter>
          </StepTransition>
        )}

        {step === "template" && (
          <StepTransition stepKey="template">
            <TemplateStep
              templates={catalogue?.templates ?? []}
              suggestedKey={catalogue?.suggestedKey ?? null}
              isLoading={templates.isPending}
              value={templateKey}
              onChange={setTemplateChoice}
            />
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => back && setStep(back)}>
                {t("Back")}
              </Button>
              <Button
                type="button"
                disabled={!selectedTemplate || !forward}
                onClick={() => forward && setStep(forward)}
              >
                {t("Next")}
              </Button>
            </DialogFooter>
          </StepTransition>
        )}

        {step === "details" && type && (
          <StepTransition stepKey="details">
            <DetailsStep
              template={selectedTemplate}
              isPending={create.isPending}
              onBack={() => back && setStep(back)}
              onSubmit={(values) =>
                create.mutate(
                  {
                    name: values.name,
                    // The purpose is the category.
                    categories: [type],
                    teamIds: values.teamIds,
                    ...(values.whatsappSettingsPhoneId
                      ? { whatsappSettingsPhoneId: values.whatsappSettingsPhoneId }
                      : {}),
                    // Only a purpose that has templates may carry one.
                    ...(selectedTemplate && hasTemplates(type)
                      ? { templateKey: selectedTemplate.key }
                      : {}),
                  },
                  { onSuccess: onCreated },
                )
              }
            />
          </StepTransition>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── step 1: what is this flow for ─────────────────────────────────────────── */

/**
 * The nine purposes as one grid. Loyalty feedback is a tile like any other — no badge, no
 * accent, no larger card — because it is one thing a flow can be for, not a headline.
 *
 * Three columns from `sm` rather than from `lg`: the dialog is capped at `max-w-3xl` from `sm`
 * up, so a viewport breakpoint above that would leave a ~700px dialog carrying two very wide
 * tiles over five rows.
 */
function PurposeStep({
  value,
  onChange,
}: Readonly<{ value: FlowType | undefined; onChange: (type: FlowType) => void }>) {
  const { t } = useTranslation();
  const copy = useFlowPurposeCopy();
  const tiles = useRef<Array<HTMLButtonElement | null>>([]);

  // A radiogroup is one tab stop, and arrows move within it. Movement follows DOM order rather
  // than rows and columns: the column count is responsive, so "down moves by three" would be
  // wrong at one of the two widths.
  const activeIndex = Math.max(
    FLOW_PURPOSES.findIndex((purpose) => purpose.value === value),
    0,
  );

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = (index + delta + FLOW_PURPOSES.length) % FLOW_PURPOSES.length;
    const purpose = FLOW_PURPOSES[next];
    if (!purpose) return;
    onChange(purpose.value);
    tiles.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={t("What is this flow for?")}
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
    >
      {FLOW_PURPOSES.map((purpose, index) => {
        const selected = purpose.value === value;
        const Icon = purpose.icon;
        return (
          <button
            key={purpose.value}
            ref={(el) => {
              tiles.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => onChange(purpose.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "flex h-full w-full flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              selected
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            <Icon size={18} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {copy[purpose.value].label}
            </span>
            <span className="text-xs leading-snug text-muted-foreground">
              {copy[purpose.value].description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── step 2: a ready-made start ─────────────────────────────────────────────── */

function TemplateStep({
  templates,
  suggestedKey,
  isLoading,
  value,
  onChange,
}: Readonly<{
  templates: FlowTemplate[];
  suggestedKey: string | null;
  isLoading: boolean;
  value: string | undefined;
  onChange: (key: string) => void;
}>) {
  const { t } = useTranslation();
  const selected = templates.find((tpl) => tpl.key === value);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div role="radiogroup" aria-label={t("Template")} className="grid gap-3">
        {templates.map((tpl) => {
          const isSelected = tpl.key === value;
          return (
            <button
              key={tpl.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(tpl.key)}
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
                "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected ? "border-primary bg-primary/5" : "border-border bg-card",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{tpl.label}</span>
                {tpl.key === suggestedKey && (
                  <Badge variant="secondary">{t("Suggested for you")}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{tpl.description}</p>
              <ul className="flex flex-wrap gap-1.5">
                {tpl.questions.map((question) => (
                  <li
                    key={question.title}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-foreground"
                  >
                    {question.kind === "rating" ? (
                      <IconStar size={12} className="text-amber-700 dark:text-amber-500" />
                    ) : (
                      <IconMessage size={12} className="text-muted-foreground" />
                    )}
                    {question.title}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      <div className="hidden lg:block">
        {selected && <FlowTemplatePreview key={selected.key} json={selected.previewJson} />}
      </div>
    </div>
  );
}

/* ── step 3: name, number, teams ────────────────────────────────────────────── */

interface DetailsValues {
  name: string;
  teamIds: string[];
  whatsappSettingsPhoneId?: string;
}

function DetailsStep({
  template,
  isPending,
  onBack,
  onSubmit,
}: Readonly<{
  template: FlowTemplate | undefined;
  isPending: boolean;
  onBack: () => void;
  onSubmit: (values: DetailsValues) => void;
}>) {
  const uid = useId();
  const { t } = useTranslation();

  // No category field: the purpose chosen in step 1 is the flow's category.
  const schema = z.object({
    name: z.string().trim().min(1, t("Please enter a name")),
    teamIds: z.array(z.string()).min(1, t("Please select at least one team")),
    whatsappSettingsPhoneId: z.string().optional(),
  });

  const form = useForm<DetailsValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: template ? t("Feedback – {label}", { label: template.label }) : "",
      teamIds: [],
      whatsappSettingsPhoneId: undefined,
    },
  });
  const { data: teamRes } = useTeamsByUser();
  const teamOptions = teamRes?.data?.map((team) => ({ value: team.id, label: team.name })) ?? [];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className="gap-4">
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{t("Name")}</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder={t("Enter Name")}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="whatsappSettingsPhoneId"
          control={form.control}
          render={({ field }) => (
            <Field>
              {/* The flow is created on this number's WABA at Meta and can only be used
                  from that number — sent from it, or attached to a template built on it. */}
              <AccountSelector
                label={t("WhatsApp number")}
                value={field.value}
                onChange={field.onChange}
              />
            </Field>
          )}
        />

        <Controller
          name="teamIds"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${uid}-teams`}>{t("Select Teams")}</FieldLabel>
              <MultiSelect
                id={`${uid}-teams`}
                options={teamOptions}
                value={field.value}
                onValueChange={field.onChange}
                placeholder={t("Select teams")}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={onBack}>
          {t("Back")}
        </Button>
        <Button type="submit" loading={isPending}>
          {t("Create Flow")}
        </Button>
      </DialogFooter>
    </form>
  );
}
