import { zodResolver } from "@hookform/resolvers/zod";
import { IconMessageStar, IconStar, IconTemplate, IconMessage } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
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
import { LOYALTY_FEEDBACK_FLOW_CATEGORY } from "@/types/enums.ts";

import { flowsCategories } from "../constants.tsx";
import { FlowTemplatePreview } from "../FlowTemplatePreview.tsx";
import {
  FLOW_TYPE_META,
  nextStep,
  previousStep,
  stepsFor,
  WIZARD_STEPS,
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
}: Readonly<{ open: boolean; onClose: () => void }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>("type");
  const [type, setType] = useState<FlowType | undefined>();
  const [templateKey, setTemplateKey] = useState<string | undefined>();

  const templates = useFlowTemplates(
    LOYALTY_FEEDBACK_FLOW_CATEGORY,
    open && type === "loyalty_feedback",
  );
  const create = useCreateFlowMutation();

  const close = () => {
    setStep("type");
    setType(undefined);
    setTemplateKey(undefined);
    onClose();
  };

  // Preselect the suggested template once the catalogue lands, unless the user got there first.
  useEffect(() => {
    if (templates.data && !templateKey) {
      setTemplateKey(templates.data.suggestedKey ?? templates.data.templates[0]?.key);
    }
  }, [templates.data, templateKey]);

  const path = type ? stepsFor(type) : WIZARD_STEPS;
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

  const selectedTemplate = templates.data?.templates.find((tpl) => tpl.key === templateKey);
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
            <TypeStep value={type} onChange={setType} />
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
              templates={templates.data?.templates ?? []}
              suggestedKey={templates.data?.suggestedKey ?? null}
              isLoading={templates.isPending}
              value={templateKey}
              onChange={setTemplateKey}
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
              type={type}
              template={selectedTemplate}
              isPending={create.isPending}
              onBack={() => back && setStep(back)}
              onSubmit={(values) =>
                create.mutate(
                  {
                    name: values.name,
                    categories: FLOW_TYPE_META[type].categories
                      ? [...FLOW_TYPE_META[type].categories]
                      : values.categories,
                    teamIds: values.teamIds,
                    ...(values.whatsappSettingsPhoneId
                      ? { whatsappSettingsPhoneId: values.whatsappSettingsPhoneId }
                      : {}),
                    ...(selectedTemplate ? { templateKey: selectedTemplate.key } : {}),
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

function TypeStep({
  value,
  onChange,
}: Readonly<{ value: FlowType | undefined; onChange: (type: FlowType) => void }>) {
  const { t } = useTranslation();
  const options: Array<{
    type: FlowType;
    title: string;
    description: string;
    icon: typeof IconStar;
  }> = [
    {
      type: "loyalty_feedback",
      title: t("Loyalty feedback"),
      description: t(
        "A short survey sent after a customer earns points. Starts from a ready-made set of questions and can be selected under Loyalty → Feedback.",
      ),
      icon: IconMessageStar,
    },
    {
      type: "other",
      title: t("Something else"),
      description: t(
        "Sign-ups, bookings, lead capture, support — an empty flow you build in the editor, with Meta's categories.",
      ),
      icon: IconTemplate,
    },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t("What is this flow for?")}
      className="grid gap-3 sm:grid-cols-2"
    >
      {options.map((option) => {
        const selected = option.type === value;
        const Icon = option.icon;
        return (
          <button
            key={option.type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.type)}
            className={cn(
              "flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
              "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "border-primary bg-primary/5" : "border-border bg-card",
            )}
          >
            <Icon size={20} className="text-primary" />
            <span className="font-medium text-foreground">{option.title}</span>
            <span className="text-sm text-muted-foreground">{option.description}</span>
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
  categories: string[];
  teamIds: string[];
  whatsappSettingsPhoneId?: string;
}

function DetailsStep({
  type,
  template,
  isPending,
  onBack,
  onSubmit,
}: Readonly<{
  type: FlowType;
  template: FlowTemplate | undefined;
  isPending: boolean;
  onBack: () => void;
  onSubmit: (values: DetailsValues) => void;
}>) {
  const uid = useId();
  const { t } = useTranslation();
  const asksCategories = !FLOW_TYPE_META[type].categories;

  const schema = z.object({
    name: z.string().trim().min(1, t("Please enter a name")),
    categories: asksCategories
      ? z.array(z.string()).min(1, t("Please select a category"))
      : z.array(z.string()),
    teamIds: z.array(z.string()).min(1, t("Please select at least one team")),
    whatsappSettingsPhoneId: z.string().optional(),
  });

  const form = useForm<DetailsValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: template ? t("Feedback – {label}", { label: template.label }) : "",
      categories: [],
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

        {asksCategories && (
          <Controller
            name="categories"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${uid}-categories`}>{t("Categories")}</FieldLabel>
                <MultiSelect
                  id={`${uid}-categories`}
                  options={flowsCategories}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={t("Select Categories")}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}

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
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner />}
          {t("Create Flow")}
        </Button>
      </DialogFooter>
    </form>
  );
}
