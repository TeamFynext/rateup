import {
  Box,
  FileInput,
  Flex,
  Group,
  Radio,
  Slider,
  Stack,
  Title,
} from "@mantine/core";
import { useTranslations } from "next-intl";

import RateupSwitch from "@/components/Switch/RateupSwitch";

import CustomSwitch from "../../../SurveyTheme/components/stylescomponent/CustomSwitch";
import CustomColorPicker from "../../components/CustomColorPicker";
import { getLogoFileValueForFileInput } from "../utils";
import ChipGroup from "./ChipGroup";
import { logoFillTypes } from "./constants";
import fileInputStyles from "./FileInput.module.css";
import styles from "./LogoTabPanel.module.css";
import radioStyles from "./Radio.module.css";

function LogoTabpanel({ state, dispatch }) {
  const {
    qrBgColor,
    qrColor,
    logoSize,
    logoFillType,
    logoBorderRadius,
    logoFile,
    isLogoEnabled = true,
  } = state;
  const translations = useTranslations();
  return (
    <Stack className={styles["panel-container"]}>
      <Title order={3} className={styles["panel-heading"]}>
        {translations("Logo Options")}
      </Title>

      <Flex className={styles["logo-tab-options-container"]}>
        <Box>
          <Stack className={styles["option-container"]}>
            <Group>
              <Title order={4} className={styles["option-heading"]}>
                {translations("Logo:")}
              </Title>
              <RateupSwitch
                offMessage={translations("Click here to enable the logo")}
                onMessage={translations("Click here to disable the logo")}
                checked={isLogoEnabled}
                onChange={(e) => {
                  dispatch({
                    type: "logo-image-switch",
                    payload: e.target.checked,
                  });
                }}
              />
            </Group>

            {isLogoEnabled && (
              <FileInput
                classNames={fileInputStyles}
                placeholder={translations("Upload Logo")}
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={(value) => {
                  dispatch({
                    type: "file-input",
                    payload: value,
                  });
                }}
                value={getLogoFileValueForFileInput(logoFile)}
              />
            )}
          </Stack>

          <Stack className={styles["option-container"]}>
            <Title order={4} className={styles["option-heading"]}>
              {translations("Size")}
            </Title>
            <Slider
              className={styles["slider"]}
              value={logoSize}
              onChange={(value) => {
                dispatch({
                  type: "logo-size",
                  payload: value,
                });
              }}
              label={(value) => value}
              step={1}
              defaultValue={70}
              min={50}
              max={100}
            />
          </Stack>

          <Stack className={styles["option-container"]}>
            <Title order={4} className={styles["option-heading"]}>
              {translations("Fill Type")}
            </Title>
            <Group className={styles["fill-types-chip-container"]}>
              <ChipGroup
                multiple={false}
                chipsData={logoFillTypes}
                value={logoFillType}
                handleChange={(value) => {
                  dispatch({
                    type: "logo-fill-type",
                    payload: value,
                  });
                }}
              />
            </Group>
          </Stack>
          {/* </Stack> */}

          {/* <Stack style={{ gap: "2rem" }}> */}
          <Stack className={styles["option-container"]}>
            <Title order={4} className={styles["option-heading"]}>
              {translations("Border Radius")}
            </Title>
            <Slider
              className={styles["slider"]}
              value={logoBorderRadius}
              onChange={(value) => {
                dispatch({
                  type: "logo-border-radius",
                  payload: value,
                });
              }}
              label={(value) => value}
              step={1}
              defaultValue={50}
              min={0}
              max={50}
            />
          </Stack>
        </Box>

        <Box>
          <Stack className={styles["option-container"]}>
            <Title order={4} className={styles["option-heading"]}>
              {translations("Background Color")}
            </Title>
            <Radio.Group
              onChange={(value) => {
                if (value === "transparent") {
                  dispatch({
                    type: "qr-bg-color",
                    payload: value,
                  });
                } else {
                  dispatch({
                    type: "qr-bg-color",
                    payload: "#FFFFFF",
                  });
                }
              }}
              value={qrBgColor.startsWith("#") ? "color" : "transparent"}
            >
              <Stack>
                <Radio
                  classNames={radioStyles}
                  value="transparent"
                  label={translations("Transparent")}
                />
                <Radio
                  classNames={radioStyles}
                  value="color"
                  label={translations("Color")}
                />
              </Stack>
            </Radio.Group>
            {qrBgColor.startsWith("#") && (
              <CustomColorPicker
                value={qrBgColor}
                onChange={(value) => {
                  dispatch({
                    type: "qr-bg-color",
                    payload: value,
                  });
                }}
              />
            )}
          </Stack>
          <Stack className={styles["option-container"]}>
            <Title order={4} className={styles["option-heading"]}>
              {translations("Color")}
            </Title>
            <CustomColorPicker
              value={qrColor}
              onChange={(value) => {
                dispatch({
                  type: "qr-color",
                  payload: value,
                });
              }}
            />
          </Stack>
        </Box>
      </Flex>
    </Stack>
  );
}

export default LogoTabpanel;
