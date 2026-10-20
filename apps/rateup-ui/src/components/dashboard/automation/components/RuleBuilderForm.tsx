import { IconArrowLeft, IconArrowRight, IconBolt, IconDeviceFloppy } from "@tabler/icons-react";
import React, { useRef, useState } from "react";
import type { FieldErrors, UseFormReturn } from "react-hook-form";
import { Controller, FormProvider } from "react-hook-form";
import { toast } from "sonner";

import { PAGE_TITLE } from "@/components/common/page-heading.tsx";
import type { AutomationTemplate } from "@/components/dashboard/automation/automation-templates.ts";
import { templateFormValues } from "@/components/dashboard/automation/automation-templates.ts";
import type { WizardStep } from "@/components/dashboard/automation/rule-sentence.ts";
import { actionPart } from "@/components/dashboard/automation/rule-sentence.ts";
import { Button } from "@/components/ui/button.tsx";
import { Field, FieldError } from "@/components/ui/field.tsx";
import { Stepper } from "@/components/ui/stepper.tsx";
import { cn } from "@/lib/utils.ts";

import ActionList from "./ActionList.tsx";
import { InstagramPublicReplies } from "./InstagramPublicReplies.tsx";
import type { CreateRuleInput, CreateRuleValues } from "./schema.ts";
import { isCommentTrigger, PLATFORMS } from "./schema.ts";
import { useRuleAccounts } from "./wizard/AccountPicker.tsx";
import { ConditionsStep } from "./wizard/ConditionsStep.tsx";
import { ReviewStep } from "./wizard/ReviewStep.tsx";
import { blockerFor, STEP_FIELDS, stepFor } from "./wizard/step-blockers.ts";
import { TemplateGallery } from "./wizard/TemplateGallery.tsx";
import { TriggerStep } from "./wizard/TriggerStep.tsx";
import { useRuleSentence } from "./wizard/useRuleSentence.ts";

interface RuleBuilderFormProps {
  form: UseFormReturn<CreateRuleInput, unknown, CreateRuleValues>;
  onSubmit: (data: CreateRuleValues) => void;
  onCancel: () => void;
  isPending: boolean;
  /** A saved rule: every step is reachable from the start and each one offers Save. */
  isEdit: boolean;
  /** Set when the rule was started from a template outside the wizard; skips the template step. */
  initialTemplateId?: string;
  /** What a template is merged over, so a rule started from a channel's page stays on it. */
  baseValues: CreateRuleInput;
}

const NEW_STEPS: readonly WizardStep[] = ["template", "trigger", "conditions", "actions", "review"];
const EDIT_STEPS: readonly WizardStep[] = ["trigger", "conditions", "actions", "review"];

const STEP_LABEL: Record<WizardStep, string> = {
  template: "Template",
  trigger: "Trigger",
  conditions: "Conditions",
  actions: "Actions",
  review: "Review",
};

function stepHeading(step: WizardStep, triggerEvent: string, isEdit: boolean) {
  switch (step) {
    case "template":
      return {
        title: "Start from a template",
        description: "Pick the closest one. You can change everything in the next steps.",
      };
    case "trigger":
      return {
        title: "What starts it?",
        description: "Choose where it listens and what has to happen.",
      };
    case "conditions":
      if (triggerEvent === "MESSAGE_RECEIVED") {
        return {
          title: "Which messages should it reply to?",
          description: "Without a condition it would answer every message — even “thanks”.",
        };
      }
      if (isCommentTrigger(triggerEvent)) {
        return {
          title: "Which comments should it answer?",
          description: "Add keywords, or leave it empty to answer every comment.",
        };
      }
      return {
        title: "Only when…",
        description: "Narrow it down, or continue to run it every time.",
      };
    case "actions":
      return { title: "What should it do?", description: "Actions run in order, top to bottom." };
    case "review":
      return isEdit
        ? { title: "Review and save", description: "Click any coloured part to change it." }
        : {
            title: "Review and switch it on",
            description: "Read it once. Click any coloured part to change it.",
          };
  }
}

/** The first error message anywhere in a nested react-hook-form error tree, with its path. */
function firstError(
  errors: unknown,
  path: string[] = [],
): { path: string[]; message: string } | null {
  if (!errors || typeof errors !== "object") return null;
  const message = (errors as { message?: unknown }).message;
  if (typeof message === "string" && message) return { path, message };
  for (const [key, value] of Object.entries(errors)) {
    if (key === "ref" || key === "type" || key === "message") continue;
    const found = firstError(value, [...path, key]);
    if (found) return found;
  }
  return null;
}

const RuleBuilderForm: React.FC<RuleBuilderFormProps> = ({
  form,
  onSubmit,
  onCancel,
  isPending,
  isEdit,
  initialTemplateId,
  baseValues,
}) => {
  const steps = isEdit ? EDIT_STEPS : NEW_STEPS;
  const firstStep: WizardStep = isEdit || initialTemplateId ? "trigger" : "template";
  const [step, setStep] = useState<WizardStep>(firstStep);
  // How far the wizard has been walked. A new rule unlocks one step at a time; a saved rule was
  // valid when it was saved, so every step is open.
  const [furthest, setFurthest] = useState(isEdit ? steps.length - 1 : steps.indexOf(firstStep));
  const [templateId, setTemplateId] = useState<string | undefined>(initialTemplateId);
  const [fromScratch, setFromScratch] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const rule = form.watch();
  const { platformOf, accounts } = useRuleAccounts();
  const { parts: sentence, lookup } = useRuleSentence(rule);

  const connectedPlatforms = PLATFORMS.map((option) => option.value).filter((platform) =>
    accounts.some((account) => account.platform === platform),
  );
  const stepIndex = steps.indexOf(step);
  const isLastStep = stepIndex === steps.length - 1;
  const heading = stepHeading(step, rule.triggerEvent, isEdit);

  let blocker: string | null = null;
  if (step === "template") {
    if (!templateId && !fromScratch) blocker = "Pick a template, or start from scratch";
  } else {
    blocker = blockerFor(step, rule, platformOf);
  }

  const goTo = (next: WizardStep) => {
    setStep(next);
    setFurthest((prev) => Math.max(prev, steps.indexOf(next)));
    bodyRef.current?.scrollTo({ top: 0 });
  };

  const goNext = async () => {
    const next = steps[stepIndex + 1];
    if (!next || blocker) return;
    const valid = await form.trigger([...STEP_FIELDS[step]], { shouldFocus: true });
    if (valid) goTo(next);
  };

  const goBack = () => {
    const previous = steps[stepIndex - 1];
    if (previous) goTo(previous);
  };

  const pickTemplate = (template: AutomationTemplate) => {
    setTemplateId(template.id);
    setFromScratch(false);
    form.reset(templateFormValues(template, baseValues, connectedPlatforms));
  };

  const startFromScratch = () => {
    setTemplateId(undefined);
    setFromScratch(true);
    form.reset(baseValues);
    goTo("trigger");
  };

  // Without this a field on another step failed validation silently: Save did nothing.
  const onInvalid = (errors: FieldErrors<CreateRuleInput>) => {
    const found = firstError(errors);
    toast.error(found?.message ?? "Some fields need attention before saving");
    if (found) goTo(stepFor(found.path));
  };

  const save = form.handleSubmit(onSubmit, onInvalid);
  const canSave = isEdit || isLastStep;

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(event) => {
          if (canSave) {
            void save(event);
            return;
          }
          // Enter in a text field mid-wizard moves on; it must not save a half-built rule.
          event.preventDefault();
          void goNext();
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-border bg-card flex h-15 shrink-0 items-center border-b px-8">
          <Stepper
            steps={steps.map((id, index) => ({
              id,
              label: STEP_LABEL[id],
              complete: isEdit || index < furthest,
              enabled: index <= furthest,
            }))}
            currentStep={step}
            onStepChange={(id) => {
              const target = steps.find((candidate) => candidate === id);
              if (target) goTo(target);
            }}
          />
        </div>

        <div className="flex min-h-0 flex-1">
          {/* min-h-0 is what lets this scroll instead of pushing the footer off. */}
          <div ref={bodyRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <div
              className={cn(
                "mx-auto flex w-full flex-col gap-8 px-8 pt-9 pb-8 lg:px-12",
                // The template grid takes three columns; the form steps read better narrow.
                step === "template" ? "max-w-240" : "max-w-160",
              )}
            >
              <header className="flex flex-col gap-1.5">
                <h1 className={PAGE_TITLE}>{heading.title}</h1>
                <p className="text-muted-foreground text-sm text-pretty">{heading.description}</p>
              </header>

              {step === "template" && (
                <TemplateGallery
                  selectedId={templateId}
                  onPick={pickTemplate}
                  onScratch={startFromScratch}
                  filterable
                  wide
                />
              )}

              {step === "trigger" && <TriggerStep />}

              {step === "conditions" && <ConditionsStep />}

              {step === "actions" && (
                <Controller
                  control={form.control}
                  name="actions"
                  render={({ fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <ActionList
                        describe={(index) => {
                          const action = rule.actions?.[index];
                          if (!action) return { text: "New action", complete: false };
                          const part = actionPart(action, lookup);
                          return { text: part.text, complete: part.role === "action" };
                        }}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      {/* Replying under the comment is something the rule does, so it sits
                          with the actions, not with the conditions. */}
                      {isCommentTrigger(rule.triggerEvent) && <InstagramPublicReplies />}
                    </Field>
                  )}
                />
              )}

              {step === "review" && <ReviewStep sentence={sentence} onEdit={goTo} />}
            </div>
          </div>
        </div>

        <footer className="border-border bg-card flex h-17 shrink-0 items-center gap-3 border-t px-8">
          {stepIndex === 0 ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={goBack}>
              <IconArrowLeft className="size-4" aria-hidden />
              Back
            </Button>
          )}
          <div className="ml-auto flex items-center gap-4">
            {blocker && (
              <span role="status" className="text-destructive text-right text-[13px]">
                {blocker}
              </span>
            )}
            {!isLastStep && (
              <Button
                key="next"
                type="button"
                variant={isEdit ? "outline" : "default"}
                disabled={Boolean(blocker)}
                onClick={() => void goNext()}
              >
                Continue
                <IconArrowRight className="size-4" aria-hidden />
              </Button>
            )}
            {canSave && (
              <Button
                key="save"
                type="submit"
                loading={isPending}
                disabled={isLastStep && Boolean(blocker)}
                className={cn(!isEdit && "min-w-44")}
              >
                {isEdit ? (
                  <IconDeviceFloppy className="size-4" aria-hidden />
                ) : (
                  <IconBolt className="size-4" aria-hidden />
                )}
                {isEdit ? "Save changes" : "Activate automation"}
              </Button>
            )}
          </div>
        </footer>
      </form>
    </FormProvider>
  );
};

export default RuleBuilderForm;
