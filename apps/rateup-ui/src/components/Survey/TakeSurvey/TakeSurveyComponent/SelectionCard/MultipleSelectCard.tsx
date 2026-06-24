import { Box, Checkbox, isLightColor, SimpleGrid, Text, useMantineTheme } from "@mantine/core";
import { useHover, useUncontrolled } from "@mantine/hooks";
import React, { useRef } from "react";

import { useIsSurveyThemePreview } from "../../../SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreviewContext.tsx";
import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext.tsx";

import classes from "./ImageCheckboxes.module.css";

interface ImageCheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  title: string;
  checkBoxEnable: boolean;
  selectedValue: any;
}

function ImageCheckbox({
  checked,
  defaultChecked,
  onChange,
  title,
  checkBoxEnable,
  selectedValue,
}: ImageCheckboxProps & Omit<React.ComponentPropsWithoutRef<"button">, keyof ImageCheckboxProps>) {
  const [value, handleChange] = useUncontrolled({
    value: checked,
    defaultValue: defaultChecked,
    finalValue: false,
    onChange,
  });
  const checkBoxRef = useRef(null);
  const theme = useMantineTheme();
  const { hovered, ref } = useHover();

  const mantineTheme = useMantineTheme();
  const themePrimaryColor = mantineTheme.colors.primaryColor
    ? mantineTheme.colors.primaryColor[5]
    : "#1C518E";

  const foregroundColor = isLightColor(themePrimaryColor) ? "#000000" : "#FFFFFF";

  const optionStylesObj = {
    height: "auto",
    border: `1px solid ${themePrimaryColor}`,
    backgroundColor: !hovered
      ? "transparent"
      : `var(--mantine-color-${theme.primaryColor}-outline-hover)`,
    color: themePrimaryColor,
  };

  const isSelected = selectedValue.includes(title);
  const selectedOptionStylesObj = isSelected
    ? {
        backgroundColor: themePrimaryColor,
        color: foregroundColor,
      }
    : {};

  return (
    <Box
      ref={ref}
      style={{
        ...optionStylesObj,
        ...selectedOptionStylesObj,
        display: "flex",
        gap: "0.625rem",
        alignItems: "center",
        userSelect: "none",
      }}
      onClick={() => {
        handleChange(!value);
        checkBoxRef?.current?.click();
      }}
      data-checked={selectedValue.includes(title) || undefined}
      className={classes.button}
    >
      <Checkbox
        ref={checkBoxRef}
        value={title}
        checked={value}
        onChange={() => {}}
        tabIndex={-1}
        styles={{ input: { cursor: "pointer" } }}
        display={checkBoxEnable ? "block" : "none"}
        color={themePrimaryColor}
        iconColor={foregroundColor}
        size="1rem"
      />
      <Text size="sm" lh={1.5}>
        {title}
      </Text>
    </Box>
  );
}

export function MultipleSelectCard({ data, selectedValue, checkBoxEnable = false }) {
  const items = data.map((item: string, index: number) => (
    <ImageCheckbox
      title={item}
      key={item + index}
      checkBoxEnable={checkBoxEnable}
      selectedValue={selectedValue}
    />
  ));

  const colsCount = { base: 1, xs: 2, sm: 3, md: 4 };
  const isSurveyThemePreview = useIsSurveyThemePreview();
  const selectedPreview = useSelectedPreview();
  const surveyThemeMobilePreview = isSurveyThemePreview && selectedPreview === "mobile";

  const columnsCount = surveyThemeMobilePreview ? 1 : colsCount;

  return (
    <SimpleGrid cols={columnsCount} spacing={16}>
      {items}
    </SimpleGrid>
  );
}
