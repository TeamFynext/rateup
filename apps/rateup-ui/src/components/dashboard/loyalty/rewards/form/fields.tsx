import { useState, type ReactNode } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { LoyaltyTier } from "@/backend/loyalty/tier.api";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { numberInputValue } from "@/utils/form.ts";

interface BaseFieldProps<T extends FieldValues, O> {
  control: Control<T, unknown, O>;
  name: FieldPath<T>;
  label: string;
  description?: ReactNode;
  placeholder?: string;
  className?: string;
}

export function TextField<T extends FieldValues, O>({
  control,
  name,
  label,
  description,
  placeholder,
  className,
  multiline,
  mono,
}: Readonly<BaseFieldProps<T, O> & { multiline?: boolean; mono?: boolean }>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          {multiline ? (
            <Textarea
              id={field.name}
              aria-invalid={fieldState.invalid}
              className="min-h-20 resize-none"
              placeholder={placeholder}
              {...field}
              value={field.value ?? ""}
            />
          ) : (
            <Input
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder={placeholder}
              className={mono ? "font-mono" : undefined}
              {...field}
              value={field.value ?? ""}
            />
          )}
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

export function NumberField<T extends FieldValues, O>({
  control,
  name,
  label,
  description,
  placeholder,
  className,
  min = 0,
  max,
  integer,
}: Readonly<BaseFieldProps<T, O> & { min?: number; max?: number; integer?: boolean }>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          <Input
            id={field.name}
            aria-invalid={fieldState.invalid}
            type="number"
            inputMode={integer ? "numeric" : "decimal"}
            placeholder={placeholder}
            min={min}
            max={max}
            {...field}
            value={numberInputValue(field.value)}
            onChange={(e) =>
              field.onChange(
                (integer
                  ? Number.parseInt(e.target.value, 10)
                  : Number.parseFloat(e.target.value)) || 0,
              )
            }
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

/** A bordered optional rule: off shows only its title, on reveals its fields. */
export function RuleToggle({
  title,
  hint,
  checked,
  onCheckedChange,
  children,
}: Readonly<{
  title: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span>
          <span className="block text-sm font-medium">{title}</span>
          <span className="block text-xs text-muted-foreground">{hint}</span>
        </span>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </label>
      {checked && children ? <div className="border-t pt-3">{children}</div> : null}
    </div>
  );
}

/**
 * "Only some tiers" as a rule. Turning it off clears the list, so what is saved is always
 * what the switch shows.
 */
export function TierRestriction({
  tiers,
  value,
  onChange,
}: Readonly<{
  tiers: readonly LoyaltyTier[];
  value: readonly string[] | undefined;
  onChange: (next: string[]) => void;
}>) {
  const { t } = useTranslation();
  const [on, setOn] = useState(() => (value?.length ?? 0) > 0);
  const selected = value ?? [];

  if (tiers.length === 0) return null;

  return (
    <RuleToggle
      title={t("Only some tiers")}
      hint={t("Leave off to offer it to every member.")}
      checked={on}
      onCheckedChange={(checked) => {
        setOn(checked);
        if (!checked) onChange([]);
      }}
    >
      <Field>
        <FieldTitle className="text-xs">{t("Available to")}</FieldTitle>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {tiers.map((tier) => (
            <Field key={tier.id} orientation="horizontal" className="w-auto gap-2">
              <Checkbox
                id={`tier-${tier.id}`}
                checked={selected.includes(tier.id)}
                onCheckedChange={(checked) =>
                  onChange(
                    checked ? [...selected, tier.id] : selected.filter((id) => id !== tier.id),
                  )
                }
              />
              <FieldLabel
                htmlFor={`tier-${tier.id}`}
                className="flex cursor-pointer items-center gap-2 text-sm font-normal"
              >
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: tier.color }}
                  aria-hidden="true"
                />
                {tier.name}
              </FieldLabel>
            </Field>
          ))}
        </div>
      </Field>
    </RuleToggle>
  );
}

export function FormSection({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="flex flex-col gap-4 border-t pt-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}
