import { useTranslation } from "react-i18next";

import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { PhoneInput } from "@/components/ui/phone-input.tsx";
import { cn } from "@/lib/utils";

import { errorAt, setValue, type TemplateForm } from "./template-form.ts";

/**
 * Phone number entry for template call-buttons.
 *
 * Uses the shadcn `PhoneInput`, which composes the shared `Input` — so passing
 * `aria-invalid` is what paints the destructive border and ring. The number is first
 * validated on save, so the error is read from `form.errors` rather than from a local
 * touched/blur state; the bridge re-checks it on change once it is showing.
 */
export function PhoneNumberField({
  form,
  path,
  label,
  className,
}: Readonly<{
  form: TemplateForm;
  path: string;
  label?: string;
  className?: string;
}>) {
  const { t: translations } = useTranslation();
  // `path` is a runtime string, so `watch` widens to the union of every field type;
  // this field is only ever pointed at a string one.
  const value = (form.watch(path as never) ?? "") as unknown as string;
  const error = errorAt(form, path);
  const onChange = (next: string) => setValue(form, path, next ?? "");

  return (
    <Field className={cn("min-w-56 flex-1", className)} data-invalid={!!error}>
      <FieldLabel htmlFor={path}>
        <p className="text-sm font-medium">{label ?? translations("Phone Number")}</p>
      </FieldLabel>
      <PhoneInput
        id={path}
        name={path}
        defaultCountry="IN"
        international
        countryCallingCodeEditable={false}
        placeholder={translations("Enter phone number")}
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
        aria-errormessage={error ? `${path}-error` : undefined}
      />
      {error && <FieldError id={`${path}-error`}>{error}</FieldError>}
    </Field>
  );
}
