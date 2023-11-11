import { Flex, ColorPicker, Button, Popover, Text } from "@mantine/core";
import { IconColorPicker } from "@tabler/icons-react";
import { useEyeDropper } from "@mantine/hooks";
import styles from "./CustomColorPicker.module.css";
import { useCallback, useState } from "react";

function CustomColorPicker({ value, onChange }) {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const { supported: isEyeDroppersupported, open } = useEyeDropper();

  const handleBlur = useCallback(
    (e) => {
      setIsColorPickerOpen(false);
      if (!value.length) {
        onChange("#000000");
      }
    },
    [value],
  );

  const handleFocus = useCallback(() => {
    setIsColorPickerOpen(true);
  }, []);

  const handleInputChange = useCallback((e) => {
    onChange(`${e.target.value}`);
  }, []);

  const pickEyeDropperColor = async () => {
    try {
      const { sRGBHex } = (await open())!;
      onChange(sRGBHex);
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <Popover opened={isColorPickerOpen} onChange={setIsColorPickerOpen}>
      <Popover.Target>
        <Flex className={styles["custom-color-picker-container"]}>
          <Button
            className={styles["color-indicator"]}
            style={{ backgroundColor: value }}
            onBlur={handleBlur}
            onFocus={handleFocus}
          />

          <input
            type="text"
            className={styles["text-input-for-picking-color"]}
            size={7}
            value={value}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onChange={handleInputChange}
          />

          {!isEyeDroppersupported ? (
            <Text className={styles["eye-dropper-not-supported-text"]}>
              Eye Dropper API Not supported in your browser
            </Text>
          ) : (
            <Button
              className={styles["eye-dropper-btn"]}
              leftSection={<IconColorPicker />}
              onClick={pickEyeDropperColor}
            >
              Eye Dropper
            </Button>
          )}
        </Flex>
      </Popover.Target>
      <Popover.Dropdown>
        <ColorPicker
          format="hex"
          value={value}
          onChange={onChange}
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
