import {
  alpha,
  Checkbox,
  Image,
  isLightColor,
  Radio,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";
import { useHover, useUncontrolled } from "@mantine/hooks";
import cx from "clsx";
import React, { useRef } from "react";

import { getImageValue } from "@/utils/file-upload/upload.ts";

import { useIsSurveyThemePreview } from "../../../SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreviewContext.tsx";
import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext.tsx";

import classes from "./ImageCheckboxes.module.css";

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
  className,
  dataValue,
  ...others
}: ImageCheckboxProps & Omit<React.ComponentPropsWithoutRef<"button">, keyof ImageCheckboxProps>) {
  const [value, handleChange] = useUncontrolled({
    value: checked,
    defaultValue: defaultChecked,
    finalValue: false,
    onChange,
  });
  const radioButtonRef = useRef(null);
  const titleTypeString = typeof title === "string";
  const { hovered, ref } = useHover();

  const mantineTheme = useMantineTheme();

  const themePrimaryColor = mantineTheme.colors.primaryColor
    ? mantineTheme.colors.primaryColor[5]
    : "#1C518E";

  const foregroundColor = isLightColor(themePrimaryColor) ? "#000000" : "#FFFFFF";

  const optionStylesObj = {
    border: `1px solid ${themePrimaryColor}`,
    backgroundColor: !hovered ? "transparent" : `${alpha(themePrimaryColor, 0.15)}`,
    color: themePrimaryColor,
  };

  const isSelected = titleTypeString ? selectedValue === title : selectedValue === title.value;
  const selectedOptionStylesObj = isSelected
    ? {
        backgroundColor: themePrimaryColor,
        color: foregroundColor,
      }
    : {};

  return (
    <UnstyledButton
      {...others}
      ref={ref}
      style={{
        ...optionStylesObj,
        ...selectedOptionStylesObj,
      }}
      onClick={() => {
        handleChange(true);
        radioButtonRef?.current?.click();
      }}
      data-checked={
        (titleTypeString ? selectedValue === title : selectedValue === title?.value) || undefined
      }
      className={cx(classes.button, titleTypeString && classes.buttonWithOutImage)}
      data-value={dataValue}
    >
      <Checkbox
        checked={selectedValue === title && value}
        display={checkBoxEnable ? "block" : "none"}
        onChange={() => {}}
      />
      {!titleTypeString ? (
        <Stack w={"100%"} gap={0}>
          <Image
            src={getImageValue(title.image, fallbackEnable)}
            style={{ aspectRatio: 4 / 3 }}
            alt={"image of pcq"}
          />
          <Text size="sm" lh={1.5} ml={checkBoxEnable ? "xs" : 0}>
            {title.value}
          </Text>
        </Stack>
      ) : (
        <Text
          size="sm"
          lh={1.5}
          ml={checkBoxEnable ? "xs" : 0}
          w={"100%"}
          ta={sizeTrim ? "center" : "left"}
        >
          {title}
        </Text>
      )}

      <Radio
        ref={radioButtonRef}
        value={titleTypeString ? title : title?.value}
        checked={value}
        onChange={() => {}}
        tabIndex={-1}
        name="test"
        display={"none"}
      />
    </UnstyledButton>
  );
}

export function SingleSelectCard({
  data,
  selectedValue,
  checkBoxEnable = false,
  includeImage = false,
  fallbackEnable = true,
  sizeTrim = false,
}) {
  const items = data?.map((item: string | { value: string; image: string }) => (
    <ImageCheckbox
      title={item}
      key={typeof item === "string" ? item : item.value}
      checkBoxEnable={checkBoxEnable}
      selectedValue={selectedValue}
      fallbackEnable={fallbackEnable}
      sizeTrim={sizeTrim}
      dataValue={typeof item === "string" ? item : item.value}
    />
  ));

  const isSurveyThemePreview = useIsSurveyThemePreview();
  const selectedPreview = useSelectedPreview();
  const surveyThemeMobilePreview = isSurveyThemePreview && selectedPreview === "mobile";

  const colsCount = includeImage
    ? { base: 2, xs: 3, sm: 4, md: 5 }
    : { base: 1, xs: 2, sm: 3, md: 4 };

  const columnsCount = surveyThemeMobilePreview ? (includeImage ? 2 : 1) : colsCount;

  return (
    <SimpleGrid cols={sizeTrim ? 1 : columnsCount} spacing={16}>
      {items}
    </SimpleGrid>
  );
}
