import { useTranslation } from "react-i18next";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

/**
 * How a provider field is filled in.
 *
 * `days` is a date written as "this many days from when the record is created" — a fixed
 * date would be wrong by the second week, so what is stored is the offset.
 */
export type MappableFieldType = "text" | "number" | "days" | "picklist";

export interface MappableField {
  /** The provider's API name; the key the value is stored under. */
  key: string;
  label: string;
  type: MappableFieldType;
  /** A picklist's choices, when the provider lists them; without them it is typed in. */
  options?: readonly { value: string; label: string }[];
  description?: string;
}

/**
 * Values RateUp sends for a provider's fields that it has no data of its own for — typically
 * the fields a CRM makes mandatory on a deal or a contact, which a push without them is
 * refused for. Stateless like `StageMappingEditor`: `value` is keyed by field, and changes go
 * back through `onChange`.
 */
export function FieldMappingEditor({
  fields,
  value,
  onChange,
  disabled = false,
}: Readonly<{
  fields: readonly MappableField[];
  value: Readonly<Record<string, string | undefined>>;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
}>) {
  const { t } = useTranslation();

  if (fields.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((field) => {
        const id = `field-mapping-${field.key}`;
        const current = value[field.key] ?? "";

        return (
          <Field key={field.key}>
            <FieldLabel htmlFor={id}>{field.label}</FieldLabel>

            {field.type === "picklist" && field.options?.length ? (
              <Select
                value={current || null}
                disabled={disabled}
                onValueChange={(next) => onChange(field.key, next ? String(next) : "")}
                items={field.options.map((option) => ({ ...option }))}
              >
                <SelectTrigger id={id} className="w-full">
                  <SelectValue placeholder={t("Select a value")} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={id}
                disabled={disabled}
                type={field.type === "days" || field.type === "number" ? "number" : "text"}
                min={field.type === "days" ? 0 : undefined}
                placeholder={
                  field.type === "days" ? t("Enter number of days from today") : t("Enter value")
                }
                value={current}
                onChange={(event) => onChange(field.key, event.target.value)}
              />
            )}

            {field.description && <FieldDescription>{field.description}</FieldDescription>}
          </Field>
        );
      })}
    </div>
  );
}
