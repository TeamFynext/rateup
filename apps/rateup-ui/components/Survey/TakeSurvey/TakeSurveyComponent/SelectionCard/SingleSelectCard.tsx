import React, { useRef } from "react";
import {
  UnstyledButton,
  Checkbox,
  Text,
  SimpleGrid,
  Radio,
  Image,
  Stack,
  useMantineTheme,
} from "@mantine/core";
import { useHover, useUncontrolled } from "@mantine/hooks";
import classes from "./ImageCheckboxes.module.css";
import { getImageValue } from "../../../../../utils/file-upload/upload";
import cx from "clsx";

interface ImageCheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?(checked: boolean): void;
  title: string | { value: string; image: string };
  checkBoxEnable: boolean;
  selectedValue: string;
  fallbackEnable: boolean;
}

export function ImageCheckbox({
  checked,
  defaultChecked,
  onChange,
  title,
  checkBoxEnable,
  selectedValue,
  fallbackEnable,
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
  const radioButtonRef = useRef(null);
  const titleTypeString = typeof title === "string";
  const theme = useMantineTheme();
  const { hovered, ref } = useHover() as {
    hovered: boolean;
    ref: React.RefObject<HTMLButtonElement>;
  };
  return (
    <UnstyledButton
      {...others}
      ref={ref}
      c={
        (
          titleTypeString
            ? selectedValue === title
            : selectedValue === title?.value
        )
          ? "var(--mantine-color-white)"
          : `var(--mantine-color-${theme.primaryColor}-outline)`
      }
      bg={
        (
          titleTypeString
            ? selectedValue === title
            : selectedValue === title?.value
        )
          ? `var(--mantine-color-${theme.primaryColor}-filled)`
          : !hovered
          ? ""
          : `var(--mantine-color-${theme.primaryColor}-outline-hover)`
      }
      style={{
        borderColor: `var(--mantine-color-${theme.primaryColor}-outline)`,
      }}
      onClick={() => {
        handleChange(true);
        radioButtonRef?.current?.click();
      }}
      data-checked={
        (titleTypeString
          ? selectedValue === title
          : selectedValue === title?.value) || undefined
      }
      className={cx(
        classes.button,
        titleTypeString && classes.buttonWithOutImage,
      )}
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
          />
          <Text size="sm" lh={1.5} ml={checkBoxEnable ? "xs" : 0}>
            {title.value}
          </Text>
        </Stack>
      ) : (
        <Text size="sm" lh={1.5} ml={checkBoxEnable ? "xs" : 0}>
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
}) {
  const items = data?.map((item: string | { value: string; image: string }) => (
    <ImageCheckbox
      title={item}
      key={typeof item === "string" ? item : item.value}
      checkBoxEnable={checkBoxEnable}
      selectedValue={selectedValue}
      fallbackEnable={fallbackEnable}
    />
  ));
  const colsCount = includeImage
    ? { base: 2, xs: 3, sm: 4, md: 5 }
    : { base: 1, xs: 2, sm: 3, md: 4 };
  return (
    <SimpleGrid cols={colsCount} spacing={10}>
      {items}
    </SimpleGrid>
  );
}
