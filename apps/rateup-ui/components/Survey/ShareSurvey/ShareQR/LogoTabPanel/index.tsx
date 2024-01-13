import { FileInput, Flex, Radio, Slider, Stack, Title } from "@mantine/core";
import styles from "./LogoTabPanel.module.css";
import fileInputStyles from "./FileInput.module.css";
import radioStyles from "./Radio.module.css";
import ChipGroup from "./ChipGroup";
import { logoFillTypes } from "./constants";
import CustomColorPicker from "../../components/CustomColorPicker";
import { useState } from "react";
import { statePropertiesEnum } from "..";
import { RateupButtonBlue } from "../../../../Button/RateupButtons";

type LogoTabPanelProps = {
  qrBgColor: string;
  qrColor: string;
  logoSize: number;
  logoFillType: string;
  logoBorderRadius: number;
  updateStateFunc: (stateProperty: statePropertiesEnum) => (value: any) => void;
  selectLogoFileInputValue: null | File;
  onSelectLogoFileInputChange: (value) => void;
};

function LogoTabpanel({
  logoFillType,
  qrBgColor,
  qrColor,
  logoSize,
  logoBorderRadius,
  updateStateFunc,
  selectLogoFileInputValue,
  onSelectLogoFileInputChange,
}: LogoTabPanelProps) {
  const {
    LogoFile,
    LogoSize,
    LogoFillType,
    LogoBorderRadius,
    QrBgColor,
    QrColor,
  } = statePropertiesEnum;

  return (
    <Stack className={styles["panel-container"]}>
      <Title order={3} className={styles["panel-heading"]}>
        Logo Options
      </Title>

      <Flex className={styles["logo-tab-options-container"]}>
        <Stack style={{ gap: "2rem" }}>
          <Stack className={styles["option-container"]}>
            <Title order={4} className={styles["option-heading"]}>
              Image
            </Title>
            <FileInput
              classNames={fileInputStyles}
              placeholder="Select Logo"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={onSelectLogoFileInputChange}
              value={selectLogoFileInputValue}
              clearable
            />
          </Stack>

          <Stack className={styles["option-container"]}>
            <Title order={4} className={styles["option-heading"]}>
              Size
            </Title>
            <Slider
              value={logoSize}
              onChange={updateStateFunc(LogoSize)}
              label={(value) => value}
              step={1}
              defaultValue={70}
              min={50}
              max={100}
            />
          </Stack>

          <Stack className={styles["option-container"]}>
            <Title order={4} className={styles["option-heading"]}>
              Fill Type
            </Title>
            <ChipGroup
              multiple={false}
              chipsData={logoFillTypes}
              value={logoFillType}
              handleChange={updateStateFunc(LogoFillType)}
            />
          </Stack>
        </Stack>

        <Stack style={{ gap: "2rem" }}>
          <Stack className={styles["option-container"]}>
            <Title order={4} className={styles["option-heading"]}>
              Border Radius
            </Title>
            <Slider
              value={logoBorderRadius}
              onChange={updateStateFunc(LogoBorderRadius)}
              label={(value) => value}
              step={1}
              defaultValue={50}
              min={0}
              max={50}
            />
          </Stack>
          <Stack className={styles["option-container"]}>
            <Title order={4} className={styles["option-heading"]}>
              Background Color
            </Title>
            <Radio.Group
              onChange={(value) => {
                const setStateFunc = updateStateFunc(QrBgColor);
                if (value === "transparent") {
                  setStateFunc("transparent");
                } else {
                  setStateFunc("#FFFFFF");
                }
              }}
              value={qrBgColor === "transparent" ? "transparent" : "color"}
            >
              <Stack>
                <Radio
                  classNames={radioStyles}
                  value="transparent"
                  label="Transparent"
                />
                <Radio classNames={radioStyles} value="color" label="Color" />
              </Stack>
            </Radio.Group>
            {qrBgColor.startsWith("#") && (
              <CustomColorPicker
                value={qrBgColor}
                onChange={updateStateFunc(QrBgColor)}
              />
            )}
          </Stack>
          <Stack className={styles["option-container"]}>
            <Title order={4} className={styles["option-heading"]}>
              Color
            </Title>
            <CustomColorPicker
              value={qrColor}
              onChange={updateStateFunc(QrColor)}
            />
          </Stack>
        </Stack>
      </Flex>
    </Stack>
  );
}

export default LogoTabpanel;
