import type { SelectProps } from "@mantine/core";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import useTemplatesAvailableForTeam from "@/hooks/team.tsx";
import type { TemplateType } from "@/types/enums.ts";

import { SelectSkeleton } from "../LoyaltyComponents/utils.tsx";
import { ContainedSelection } from "./ContainedInput/ContainedInput.tsx";

interface WaTemplateSelector extends SelectProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  teamId?: string;
  placeholder?: string;
  templateType?: TemplateType;
}

const WaTemplateSelector = ({
  teamId,
  value,
  label,
  placeholder,
  onChange,
  templateType,
  ...props
}: WaTemplateSelector) => {
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
    <ContainedSelection
      label={label || translations("whatsApp Template")}
      placeholder={placeholder || translations("Select a template")}
      data={templatesData}
      value={value}
      onChange={onChange}
      {...props}
      nothingFoundMessage={"No templates found"}
    />
  );
};

export default WaTemplateSelector;
