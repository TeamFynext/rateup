import { useId } from "react";

import { useSurveys } from "@/backend/surveys/surveys.query";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SurveyType } from "@/types/enums.ts";

/**
 * This selector is still written against the Mantine form API (`values`/`setFieldValue`) while
 * its callers hand it a react-hook-form instance, which exposes neither — see the migration
 * notes. This describes what the component touches rather than changing its behaviour.
 */
interface WebsurveySelectorForm {
  values?: { buttons?: Array<{ url?: string; example?: string[] }> } & Record<string, unknown>;
  setFieldValue?: (path: string, value: unknown) => void;
  /** Present on the react-hook-form instance the callers actually pass. */
  getValues?: unknown;
}

interface WebsurveySelectorProps {
  onChange?: (flowId: string) => void;
  onlyPublished?: boolean;
  form: WebsurveySelectorForm;
  carousel?: string;
  index?: number;
  label?: React.ReactNode;
  placeholder?: string;
  error?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  /** Accepted for call-site compatibility; the shadcn Select filters natively. */
  searchable?: boolean;
}

/** Reads one property off a value that may not be an object. */
const readProp = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>)[key] : undefined;

export function WebsurveySelector({
  onlyPublished = false,
  form,
  carousel,
  index,
  label = "Websurvey",
  placeholder = "Select websurvey",
  error,
  disabled,
  className,
}: Readonly<WebsurveySelectorProps>) {
  const uid = useId();
  const { isPending, data } = useSurveys();

  if (isPending || !data) {
    return <Skeleton className="mt-2 h-11 w-12" />;
  }

  const filteredWebSurvey = Array.isArray(data)
    ? onlyPublished
      ? data.filter((survey) => survey.isPublished && survey.type === SurveyType.Web)
      : data.filter((survey) => survey.type === SurveyType.Web)
    : [];

  const selectOptions = filteredWebSurvey.map((survey) => ({
    value: survey.teams?.[0]?.shortUrlId
      ? `${import.meta.env.VITE_FRONTEND_URL}/ws/?:${survey?.teams?.[0]?.shortUrlId}`
      : `${import.meta.env.VITE_FRONTEND_URL}/public/survey/?:error${Math.floor(100000 + Math.random() * 900000).toString()}`,
    label: survey?.title,
  }));

  const handleChange = (url: string) => {
    const arr = url?.split("?");
    if (carousel) {
      form.setFieldValue?.(`${carousel}.url`, `${arr?.[0]}{{1}}`);
      form.setFieldValue?.(`${carousel}.example`, [arr?.[1]]);
    } else {
      form.setFieldValue?.(`buttons.${index}.url`, `${arr?.[0]}{{1}}`);
      form.setFieldValue?.(`buttons.${index}.example`, [arr?.[1]]);
    }
  };

  let value = "";
  if (carousel) {
    const fields = carousel.split(".");
    const button = fields.reduce<unknown>((acc, key) => readProp(acc, key), form.values);
    const url = readProp(button, "url");
    const example = readProp(button, "example");
    value = typeof url === "string" ? url.replace("{{1}}", `?${example}`) : "";
  } else if (index !== undefined) {
    const button = form.values?.buttons?.[index];
    value = button?.url?.replace("{{1}}", `?${button.example}`) ?? "";
  }

  return (
    <Field className={className}>
      {label && (
        <FieldLabel htmlFor={`${uid}-field`} className="mb-1">
          {label}
        </FieldLabel>
      )}
      <Select
        value={value ?? ""}
        onValueChange={(value) => handleChange(value ?? "")}
        items={selectOptions}
        disabled={disabled}
      >
        <SelectTrigger id={`${uid}-field`} className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {selectOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </Field>
  );
}
