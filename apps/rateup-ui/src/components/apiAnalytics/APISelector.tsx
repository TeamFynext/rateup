import { Globe, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select.tsx";

interface ApiSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function ApiSelector({ value, onChange, className }: ApiSelectorProps) {
  const { t } = useTranslation("apianalytics");
  const apiOptions = [
    { value: "external", label: t("External"), icon: Globe },
    { value: "whatsapp", label: t("Campaign & Inbox"), icon: MessageCircle },
    { value: "all", label: t("All"), icon: MessageCircle },
  ];

  const selectedOption = apiOptions.find((opt) => opt.value === value);
  const Icon = selectedOption?.icon || Globe;

  return (
    <Select value={value} onValueChange={(value) => onChange?.(value ?? "")} items={apiOptions}>
      <SelectTrigger className={`${className || ""}`}>
        <Icon className="w-4 h-4 mr-2 text-primary" />
        <SelectValue placeholder="Select API" />
      </SelectTrigger>

      <SelectContent className="z-[1050]">
        {apiOptions.map((api) => {
          return (
            <SelectItem key={api.value} value={api.value}>
              <div className="flex items-center gap-2">{api.label}</div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
