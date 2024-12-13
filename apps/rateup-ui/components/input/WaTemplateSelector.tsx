import { SelectProps } from "@mantine/core";

import useTemplatesAvailableForTeam from "@/hooks/team";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import useTranslations from "@/dictionaries/useTranslation";

import { SelectSkeleton } from "../loyalty/utils";
import { ContainedSelection } from "./ContainedInput/ContainedInput";

interface WaTemplateSelector extends SelectProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  teamId?: string;
  placeholder?: string;
}

const WaTemplateSelector = ({
  teamId,
  value,
  label,
  placeholder,
  onChange,
  ...props
}: WaTemplateSelector) => {
  const { translations } = useTranslations();
  const { data: allTemplates, isLoading } = useWaTemplates();
  const templates = teamId
    ? useTemplatesAvailableForTeam(teamId)
    : allTemplates;

  const templatesData = templates?.map((t) => {
    return {
      value: t?.id,
      label: t?.data?.name,
    };
  });

  if (value?.length && !templates?.map((t) => t.id).includes(value)) {
    onChange(null);
  }

  if (isLoading) return <SelectSkeleton />;

  return (
    <ContainedSelection
      label={label || translations["whatsApp Template"]}
      placeholder={placeholder || translations["Select a template"]}
      data={templatesData}
      value={value}
      onChange={onChange}
      {...props}
      nothingFoundMessage={"No templates found"}
    />
  );
};

export default WaTemplateSelector;
