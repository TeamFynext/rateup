import { useId, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import useTemplatesAvailableForTeam from "@/hooks/team.tsx";
import type { TemplateType } from "@/types/enums.ts";

import { SelectSkeleton } from "../LoyaltyComponents/utils.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";

interface WaTemplateSelector {
  value?: string;
  onChange?: (value: string) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  teamId?: string;
  placeholder?: string;
  templateType?: TemplateType;
  disabled?: boolean;
  className?: string;
  withAsterisk?: boolean;
  /** Accepts a react-hook-form field spread. */
  name?: string;
  onBlur?: () => void;
  ref?: React.Ref<any>;
}

const WaTemplateSelector = ({
  teamId,
  value,
  label,
  description,
  error,
  placeholder,
  onChange,
  templateType,
  disabled,
  className,
  withAsterisk,
  onBlur,
}: WaTemplateSelector) => {
  const uid = useId();
  const { t: translations } = useTranslation();
  const { data: allTemplates, isLoading } = useWaTemplates(templateType);
  const templates = teamId ? useTemplatesAvailableForTeam(teamId) : allTemplates;

  const templatesData = useMemo(
    () =>
      templates?.map((t) => ({
        value: String(t?.id),
        label: t?.data?.name,
      })),
    [templates],
  );

  useEffect(() => {
    if (value?.length && templatesData && !templatesData?.map((t) => t.value).includes(value)) {
      onChange(null);
    }
  }, [value, templatesData, onChange]);

  if (isLoading) return <SelectSkeleton />;

  return (
    <Field className={className}>
      <FieldLabel htmlFor={`${uid}-field`}>
        {label || translations("whatsApp Template")}
        {withAsterisk && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <Select
        items={templatesData ?? []}
        value={value ?? ""}
        onValueChange={(next) => {
          onChange?.(next as string);
          onBlur?.();
        }}
        disabled={disabled}
      >
        <SelectTrigger id={`${uid}-field`} className="w-full" aria-invalid={!!error}>
          <SelectValue placeholder={placeholder || translations("Select a template")} />
        </SelectTrigger>
        <SelectContent>
          {templatesData?.length ? (
            templatesData.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No templates found</div>
          )}
        </SelectContent>
      </Select>
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
};

export default WaTemplateSelector;
