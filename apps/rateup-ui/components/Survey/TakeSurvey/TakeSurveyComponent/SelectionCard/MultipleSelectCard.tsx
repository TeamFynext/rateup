import React, { useRef } from "react";
import {
  UnstyledButton,
  Checkbox,
  Text,
  SimpleGrid,
  useMantineTheme,
  Button,
  isLightColor,
} from "@mantine/core";
import { useHover, useUncontrolled } from "@mantine/hooks";
import classes from "./ImageCheckboxes.module.css";
import { IconCheck } from "@tabler/icons-react";

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
  const { hovered, ref } = useHover() as {
    hovered: boolean;
    ref: React.RefObject<HTMLButtonElement>;
  };

  const mantineTheme = useMantineTheme();
  const themePrimaryColor = mantineTheme.colors.primaryColor[5];

  const foregroundColor = isLightColor(themePrimaryColor)
    ? "#000000"
    : "#FFFFFF";

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
    <Button
      {...others}
      ref={ref}
      style={{
        ...optionStylesObj,
        ...selectedOptionStylesObj,
      }}
      onClick={() => {
        handleChange(!value);
        checkBoxRef?.current?.click();
      }}
      data-checked={selectedValue.includes(title) || undefined}
      className={classes.button}
      leftSection={isSelected ? <IconCheck size={"1rem"} /> : null}
    >
      <Checkbox
        ref={checkBoxRef}
        value={title}
        checked={value}
        onChange={() => {}}
        tabIndex={-1}
        style={{ visibility: "hidden", width: 0, height: 0 }}
        styles={{ input: { cursor: "pointer" } }}
        display={checkBoxEnable ? "block" : "none"}
      />
      <Text size="sm" lh={1.5}>
        {title}
      </Text>
    </Button>
  );
}

export function MultipleSelectCard({
  data,
  selectedValue,
  checkBoxEnable = false,
}) {
  const items = data.map((item: string, index: number) => (
    <ImageCheckbox
      title={item}
      key={item + index}
      checkBoxEnable={checkBoxEnable}
      selectedValue={selectedValue}
    />
  ));
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing={8}>
      {items}
    </SimpleGrid>
  );
}
