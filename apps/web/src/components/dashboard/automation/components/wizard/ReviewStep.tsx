import { Field, FieldError, FieldTitle } from "@rateup/ui/components/field";
import { Input } from "@rateup/ui/components/input";
import { Controller, useFormContext } from "react-hook-form";

import type { SentencePart, WizardStep } from "@/components/dashboard/automation/rule-sentence.ts";

import RuleOptions from "../RuleOptions.tsx";
import type { CreateRuleInput } from "../schema.ts";
import { RuleSentenceText } from "./RuleSentenceText.tsx";
import { WizardSection } from "./WizardSection.tsx";

export function ReviewStep({
  sentence,
  onEdit,
}: Readonly<{ sentence: readonly SentencePart[]; onEdit: (step: WizardStep) => void }>) {
  const { control } = useFormContext<CreateRuleInput>();

  return (
    <div className="flex flex-col gap-8">
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldTitle>Name</FieldTitle>
            <Input
              placeholder="e.g. Refund requests"
              {...field}
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <div className="bg-card ring-foreground/10 rounded-xl px-5 py-4 ring-1">
        <RuleSentenceText parts={sentence} onEdit={onEdit} className="text-base leading-[1.8]" />
      </div>

      <WizardSection title="Limits">
        <RuleOptions />
      </WizardSection>
    </div>
  );
}
