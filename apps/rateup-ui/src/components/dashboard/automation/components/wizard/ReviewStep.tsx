import { Controller, useFormContext } from "react-hook-form";

import type { SentencePart, WizardStep } from "@/components/dashboard/automation/rule-sentence.ts";
import { Field, FieldError, FieldTitle } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";

import RuleOptions from "../RuleOptions.tsx";
import type { CreateRuleInput } from "../schema.ts";
import { RuleSentenceText } from "./RuleSentenceText.tsx";

export function ReviewStep({
  sentence,
  onEdit,
}: Readonly<{ sentence: readonly SentencePart[]; onEdit: (step: WizardStep) => void }>) {
  const { control } = useFormContext<CreateRuleInput>();

  return (
    <div className="flex flex-col gap-6">
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldTitle className="text-foreground/80 text-[13px] font-medium">Name</FieldTitle>
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

      <div className="flex flex-col gap-2">
        <span className="text-foreground/80 text-[13px] font-medium">Limits</span>
        <RuleOptions />
      </div>
    </div>
  );
}
