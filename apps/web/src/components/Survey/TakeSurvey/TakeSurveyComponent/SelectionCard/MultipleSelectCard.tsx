import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import { useIsSurveyThemePreview } from "../../../SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreviewContext.tsx";
import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext.tsx";
import { isLightColor } from "../QuestionForms/isLightColor.ts";
import { useThemePrimaryColor } from "../QuestionForms/useThemePrimaryColor.ts";

interface ImageCheckboxProps {
  checked: boolean;
  onClick: () => void;
  title: string;
  checkBoxEnable: boolean;
}

function ImageCheckbox({ checked, onClick, title, checkBoxEnable }: ImageCheckboxProps) {
  const [hovered, setHovered] = useState(false);
  const themePrimaryColor = useThemePrimaryColor();

  const foregroundColor = isLightColor(themePrimaryColor) ? "#000000" : "#FFFFFF";

  const style: React.CSSProperties = checked
    ? { backgroundColor: themePrimaryColor, color: foregroundColor }
    : {
        backgroundColor: hovered ? `${themePrimaryColor}26` : "white",
        color: themePrimaryColor,
      };

  return (
    <button
      type="button"
      style={{ border: `1px solid ${themePrimaryColor}`, ...style }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-checked={checked || undefined}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-sm p-3 shadow-[0px_1px_0px_rgba(0,0,0,0.05),0px_0px_8px_rgba(0,0,0,0.11)] transition-[background-color,border-color] duration-150 select-none hover:shadow-[1px_1px_1px_rgba(0,0,0,0.05),1px_1px_10px_rgba(0,0,0,0.11)]",
      )}
    >
      {checkBoxEnable && (
        <Checkbox
          checked={checked}
          onCheckedChange={() => {}}
          className="pointer-events-none shrink-0"
          tabIndex={-1}
        />
      )}
      <span className="text-sm leading-[1.5]">{title}</span>
    </button>
  );
}

export function MultipleSelectCard({
  data,
  selectedValue,
  onChange,
  checkBoxEnable = false,
}: {
  data: string[];
  selectedValue: string[];
  onChange: (values: string[]) => void;
  checkBoxEnable?: boolean;
}) {
  const isSurveyThemePreview = useIsSurveyThemePreview();
  const selectedPreview = useSelectedPreview();
  const surveyThemeMobilePreview = isSurveyThemePreview && selectedPreview === "mobile";

  const gridCols = surveyThemeMobilePreview
    ? "grid-cols-1"
    : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  const handleToggle = (value: string) => {
    const next = selectedValue.includes(value)
      ? selectedValue.filter((v) => v !== value)
      : [...selectedValue, value];
    onChange(next);
  };

  return (
    <div className={cn("grid gap-4", gridCols)}>
      {data.map((item: string, index: number) => (
        <ImageCheckbox
          title={item}
          key={item + index}
          checkBoxEnable={checkBoxEnable}
          checked={selectedValue.includes(item)}
          onClick={() => handleToggle(item)}
        />
      ))}
    </div>
  );
}
