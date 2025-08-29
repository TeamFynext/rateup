"use client";

import { useEffect } from "react";

import { SelectProps } from "@mantine/core";
import { useTranslations } from "next-intl";

import { TemplateType } from "@/types/enums";
import useTemplatesAvailableForTeam from "@/hooks/team";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";

import { SelectSkeleton } from "../LoyaltyComponents/utils";
import { ContainedSelection } from "./ContainedInput/ContainedInput";

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
  const translations = useTranslations();
  const { data: allTemplates, isLoading } = useWaTemplates(templateType);
  const templates = teamId
    ? useTemplatesAvailableForTeam(teamId)
    : allTemplates;

  const templatesData = templates?.map((t) => ({
    value: t?.id,
    label: t?.data?.name,
  }));

  useEffect(() => {
    if (
      value?.length &&
      templatesData &&
      !templatesData?.map((t) => t.value).includes(value)
    ) {
      onChange(null);
    }
  }, [value, templatesData]);

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
