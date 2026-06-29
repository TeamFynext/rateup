import { Button, ColorPicker, Flex, Popover } from "@mantine/core";
import { useEyeDropper } from "@mantine/hooks";
import { IconColorPicker } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "./CustomColorPicker.module.css";
import buttonStyles from "./MantineButtonStyles.module.css";

enum Size {
  md = "md",
  lg = "lg",
}

interface CustomColorPickerProps {
  className?: string;
  value: string;
  onChange: any;
  size?: string;
  elementToBeDisplayed?: React.ReactNode;
  withoutEyedropper?: boolean;
}

function CustomColorPicker({
  className = "",
  value,
  onChange,
  size = "md",
  elementToBeDisplayed,
  withoutEyedropper,
}: CustomColorPickerProps) {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const { supported: isEyeDroppersupported, open } = useEyeDropper();
  const handleBlur = useCallback(
    (_e) => {
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
    (eventOrvalue) => {
      let resultValue = eventOrvalue;
      if (typeof eventOrvalue === "object") {
        resultValue = eventOrvalue.target.value;
      }
      if (!resultValue.length) {
        resultValue = "#000000";
      }
      onChange(resultValue);
    },
    [onChange],
  );

  const pickEyeDropperColor = async () => {
    try {
      const { sRGBHex } = await open();
      handleInputChange(sRGBHex);
    } catch {}
  };
  const { t: translations } = useTranslation();
  return (
    <Popover opened={isColorPickerOpen} onChange={setIsColorPickerOpen}>
      <Popover.Target>
        {elementToBeDisplayed ? (
          <Flex
            className={"custom-element-from-props"}
            onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
          >
            {elementToBeDisplayed}
          </Flex>
        ) : (
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
              maxLength={7}
              value={!value?.length ? "#000000" : value}
              onBlur={handleBlur}
              onFocus={handleFocus}
              onChange={handleInputChange}
            />

            {!isEyeDroppersupported || withoutEyedropper ? null : (
              <Button
                className={`${styles["eye-dropper-btn"]} eye-dropper-btn`}
                leftSection={<IconColorPicker />}
                onClick={pickEyeDropperColor}
                classNames={buttonStyles}
              >
                {translations("Eye Dropper")}
              </Button>
            )}
          </Flex>
        )}
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
