import { Flex, ColorPicker, Button, Popover, Text } from "@mantine/core";
import { IconColorPicker } from "@tabler/icons-react";
import { useEyeDropper, useMediaQuery } from "@mantine/hooks";
import styles from "./CustomColorPicker.module.css";
import buttonStyles from "./MantineButtonStyles.module.css";
import { useCallback, useState } from "react";

enum Size {
  md = "md",
  lg = "lg",
}

type CustomColorPickerProps = {
  className?: string;
  value: string;
  onChange: any;
  optionalDataObj?: any;
  size?: string;
};

function CustomColorPicker({
  className = "",
  value,
  onChange,
  optionalDataObj,
  size = "md",
}: CustomColorPickerProps) {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const { supported: isEyeDroppersupported, open } = useEyeDropper();
  const handleBlur = useCallback(
    (e) => {
      setIsColorPickerOpen(false);
      if (!value?.length) {
        handleInputChange("#000000");
      }
    },
    [value],
  );

  const handleFocus = useCallback(() => {
    setIsColorPickerOpen(true);
  }, []);

  const handleInputChange = useCallback(
    (eventOrValue) => {
      let value =
        typeof eventOrValue === "object"
          ? eventOrValue.target.value
          : eventOrValue;
      if (!value.length) value = "#000000";

      if (optionalDataObj) {
        onChange({
          ...optionalDataObj,
          value,
        });
      } else {
        onChange(value);
      }
    },
    [optionalDataObj],
  );

  const pickEyeDropperColor = async () => {
    try {
      const { sRGBHex } = (await open())!;
      handleInputChange(sRGBHex);
    } catch (e) {}
  };

  return (
    <Popover opened={isColorPickerOpen} onChange={setIsColorPickerOpen}>
      <Popover.Target>
        <Flex
          className={`${styles["custom-color-picker-container"]} custom-color-picker-container ${size === Size.md ? styles["size-md"] : ""} ${className}`}
        >
          <Button
            className={`${styles["color-indicator"]} color-indicator`}
            style={{ backgroundColor: value }}
            onBlur={handleBlur}
            onFocus={handleFocus}
            color={`${value}`}
          />

          <input
            type="text"
            className={`${styles["text-input-for-picking-color"]} text-input-for-picking-color`}
            size={7}
            value={!value?.length ? "#000000" : value}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onChange={handleInputChange}
          />

          {!isEyeDroppersupported ? null : (
            <Button
              className={`${styles["eye-dropper-btn"]} eye-dropper-btn`}
              leftSection={<IconColorPicker />}
              onClick={pickEyeDropperColor}
              classNames={buttonStyles}
              color="#1C518E"
            >
              {"Eye Dropper"}
            </Button>
          )}
        </Flex>
      </Popover.Target>
      <Popover.Dropdown>
        <ColorPicker
          format="hex"
          value={!value?.length ? "#000000" : value}
          onChange={handleInputChange}
          swatches={[
            "#25262b",
            "#868e96",
            "#fa5252",
            "#e64980",
            "#be4bdb",
            "#7950f2",
            "#4c6ef5",
            "#228be6",
            "#15aabf",
            "#12b886",
            "#40c057",
            "#82c91e",
            "#fab005",
            "#fd7e14",
          ]}
        />
      </Popover.Dropdown>
    </Popover>
  );
}

export default CustomColorPicker;
