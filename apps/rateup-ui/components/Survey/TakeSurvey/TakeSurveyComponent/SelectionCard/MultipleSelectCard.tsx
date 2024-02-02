import React, { useRef } from "react";
import {
  UnstyledButton,
  Checkbox,
  Text,
  SimpleGrid,
  useMantineTheme,
} from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import classes from "./ImageCheckboxes.module.css";
import { returnColorsForTheme } from "../../../SurveyTheme/SurveyTheme.utils";
import { styleAttributeTypesEnum } from "../../../SurveyTheme/SurveyTheme.enums";

interface ImageCheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?(checked: boolean): void;
  title: string;
  checkBoxEnable: boolean;
  selectedValue: any;
}

export function ImageCheckbox({
  checked,
  defaultChecked,
  onChange,
  title,
  checkBoxEnable,
  selectedValue,
  className,
  ...others
}: ImageCheckboxProps &
  Omit<React.ComponentPropsWithoutRef<"button">, keyof ImageCheckboxProps>) {
  const [value, handleChange] = useUncontrolled({
    value: checked,
    defaultValue: defaultChecked,
    finalValue: false,
    onChange,
  });
  const checkBoxRef = useRef(null);
  const theme = useMantineTheme();
  console.log(theme);
  console.log(title === selectedValue[0]);
  return (
    <UnstyledButton
      {...others}
      onClick={() => {
        handleChange(!value);
        checkBoxRef?.current?.click();
      }}
      data-checked={selectedValue.includes(title) || undefined}
      className={classes.button}
      c={returnColorsForTheme(styleAttributeTypesEnum.TEXT, theme)}
      bg={
        selectedValue.includes(title)
          ? returnColorsForTheme(styleAttributeTypesEnum.ANSWEREDBG, theme)
          : returnColorsForTheme(styleAttributeTypesEnum.BACKGROUND, theme)
      }
      style={{
        borderColor: selectedValue.includes(title)
          ? returnColorsForTheme(styleAttributeTypesEnum.BORDER, theme)
          : undefined,
      }}
    >
      <Checkbox
        ref={checkBoxRef}
        value={title}
        checked={value}
        onChange={() => {}}
        tabIndex={-1}
        styles={{ input: { cursor: "pointer" } }}
        display={checkBoxEnable ? "block" : "none"}
      />
      <Text size="sm" lh={1.5} ml={"xs"}>
        {title}
      </Text>
    </UnstyledButton>
  );
}

export function MultipleSelectCard({
  data,
  selectedValue,
  checkBoxEnable = false,
}) {
  const items = data.map((item: string) => (
    <ImageCheckbox
      title={item}
      key={item}
      checkBoxEnable={checkBoxEnable}
      selectedValue={selectedValue}
    />
  ));
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }}>{items}</SimpleGrid>
  );
}
