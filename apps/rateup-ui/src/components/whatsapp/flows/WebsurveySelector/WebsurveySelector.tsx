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

interface WebsurveySelectorProps {
  onChange?: (flowId: string) => void;
  onlyPublished?: boolean;
  form: any;
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
      form.setFieldValue(`${carousel}.url`, `${arr?.[0]}{{1}}`);
      form.setFieldValue(`${carousel}.example`, [arr?.[1]]);
    } else {
      form.setFieldValue(`buttons.${index}.url`, `${arr?.[0]}{{1}}`);
      form.setFieldValue(`buttons.${index}.example`, [arr?.[1]]);
    }
  };

  let value = "";
  if (carousel) {
    const fields = carousel.split(".");
    const button = fields.reduce((acc, key) => acc?.[key], form.values);
    value = button.url?.replace("{{1}}", `?${button.example}`) ?? "";
  } else if (index !== undefined) {
    value =
      form.values.buttons[index].url?.replace("{{1}}", `?${form.values.buttons[index].example}`) ??
      "";
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
