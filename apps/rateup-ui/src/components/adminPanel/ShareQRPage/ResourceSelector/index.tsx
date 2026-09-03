import { IconAnalyze } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

import { resourceOptions } from "./constants.tsx";

function ResourceSelector({
  resource,
  setResource,
  onGenerateBtnClick,
}: {
  resource: string;
  setResource: (resource: string) => void;
  onGenerateBtnClick: () => void;
}) {
  const { t: translations } = useTranslation();
  const items = resourceOptions.map((option) => ({
    value: option,
    label: option,
  }));
  return (
    <div className={"mb-[1.125rem] flex flex-wrap gap-4"}>
      <Select value={resource} onValueChange={(value) => setResource(value ?? "")} items={items}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder={translations("Select a Resource")} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={onGenerateBtnClick}>
        {translations("Generate")}
        <IconAnalyze data-icon="inline-end" />
      </Button>
    </div>
  );
}

export default ResourceSelector;
