import React, { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getImageValue } from "@/utils/file-upload/upload.ts";

import { useIsSurveyThemePreview } from "../../../SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreviewContext.tsx";
import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext.tsx";
import { isLightColor } from "../QuestionForms/isLightColor.ts";
import { useThemePrimaryColor } from "../QuestionForms/useThemePrimaryColor.ts";

function hexAlpha(hex: string, opacity: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

interface ImageCheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  title: string | { value: string; image: string };
  checkBoxEnable: boolean;
  selectedValue: string;
  fallbackEnable: boolean;
  sizeTrim: boolean;
  dataValue: string;
}

function ImageCheckbox({
  checked,
  defaultChecked,
  onChange,
  title,
  checkBoxEnable,
  selectedValue,
  fallbackEnable,
  sizeTrim,
  dataValue,
  ...others
}: ImageCheckboxProps & Omit<React.ComponentPropsWithoutRef<"button">, keyof ImageCheckboxProps>) {
  const [internalValue, setInternalValue] = useState(defaultChecked ?? false);
  const value = checked !== undefined ? checked : internalValue;

  const handleChange = (newValue: boolean) => {
    if (checked === undefined) setInternalValue(newValue);
    onChange?.(newValue);
  };

  const [hovered, setHovered] = useState(false);
  const titleTypeString = typeof title === "string";

  const themePrimaryColor = useThemePrimaryColor();

  const foregroundColor = isLightColor(themePrimaryColor) ? "#000000" : "#FFFFFF";
  const isSelected = titleTypeString ? selectedValue === title : selectedValue === title.value;

  const buttonStyle: React.CSSProperties = {
    border: `1px solid ${themePrimaryColor}`,
    backgroundColor: isSelected
      ? themePrimaryColor
      : hovered
        ? hexAlpha(themePrimaryColor, 0.15)
        : "transparent",
    color: isSelected ? foregroundColor : themePrimaryColor,
    boxShadow: hovered
      ? "rgba(0,0,0,0.05) 1px 1px 1px, rgba(0,0,0,0.11) 1px 1px 10px"
      : "rgba(0,0,0,0.05) 0px 1px 0px, rgba(0,0,0,0.11) 0px 0px 8px",
  };

  return (
    <button
      {...others}
      type="button"
      style={buttonStyle}
      onClick={() => handleChange(true)}
      data-checked={isSelected || undefined}
      data-value={dataValue}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "flex w-full cursor-pointer rounded-sm p-4 transition-[background-color,border-color] duration-150",
        titleTypeString ? "items-center" : "items-start",
      )}
    >
      {checkBoxEnable && (
        <Checkbox
          checked={selectedValue === title && value}
          onCheckedChange={() => {}}
          className="pointer-events-none shrink-0"
          tabIndex={-1}
        />
      )}
      {!titleTypeString ? (
        <div className="flex w-full flex-col">
          <img
            src={getImageValue(title.image, fallbackEnable)}
            style={{ aspectRatio: "4 / 3" }}
            alt="image of pcq"
            className="w-full object-cover"
          />
          <span className={cn("text-sm leading-[1.5]", checkBoxEnable && "ml-2")}>
            {title.value}
          </span>
        </div>
      ) : (
        <span
          className={cn(
            "w-full text-sm leading-[1.5]",
            checkBoxEnable && "ml-2",
            sizeTrim ? "text-center" : "text-left",
          )}
        >
          {title}
        </span>
      )}
    </button>
  );
}

export function SingleSelectCard({
  data,
  selectedValue,
  onChange,
  checkBoxEnable = false,
  includeImage = false,
  fallbackEnable = true,
  sizeTrim = false,
}: {
  data: Array<string | { value: string; image: string }>;
  selectedValue: string;
  onChange?: (value: string) => void;
  checkBoxEnable?: boolean;
  includeImage?: boolean;
  fallbackEnable?: boolean;
  sizeTrim?: boolean;
}) {
  const isSurveyThemePreview = useIsSurveyThemePreview();
  const selectedPreview = useSelectedPreview();
  const surveyThemeMobilePreview = isSurveyThemePreview && selectedPreview === "mobile";

  const gridCols = surveyThemeMobilePreview
    ? includeImage
      ? "grid-cols-2"
      : "grid-cols-1"
    : includeImage
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  return (
    <div className={cn("grid gap-4", sizeTrim ? "grid-cols-1" : gridCols)}>
      {data?.map((item: string | { value: string; image: string }) => {
        const itemValue = typeof item === "string" ? item : item.value;
        return (
          <ImageCheckbox
            title={item}
            key={itemValue}
            onChange={(checked) => {
              if (checked) onChange?.(itemValue);
            }}
            checkBoxEnable={checkBoxEnable}
            selectedValue={selectedValue}
            fallbackEnable={fallbackEnable}
            sizeTrim={sizeTrim}
            dataValue={itemValue}
          />
        );
      })}
    </div>
  );
}
