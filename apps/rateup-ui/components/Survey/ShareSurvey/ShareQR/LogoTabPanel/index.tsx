import {
  FileInput,
  Flex,
  Group,
  Radio,
  Slider,
  Stack,
  Title,
} from "@mantine/core";
import styles from "./LogoTabPanel.module.css";
import fileInputStyles from "./FileInput.module.css";
import radioStyles from "./Radio.module.css";
import ChipGroup from "./ChipGroup";
import { logoFillTypes } from "./constants";
import CustomColorPicker from "../../components/CustomColorPicker";
import { getLogoFileValueForFileInput } from "../utils";

function LogoTabpanel({ state, dispatch, shareSettings }) {
  const {
    qrBgColor,
    qrColor,
    logoSize,
    logoFillType,
    logoBorderRadius,
    logoFile,
  } = state;

  return (
    <Stack className={styles["panel-container"]}>
      <Title order={3} className={styles["panel-heading"]}>
        Logo Options
      </Title>

      <Flex className={styles["logo-tab-options-container"]}>
        {/* <Stack style={{ gap: "2rem" }}> */}
        <Stack className={styles["option-container"]}>
          <Title order={4} className={styles["option-heading"]}>
            Image
          </Title>
          <FileInput
            classNames={fileInputStyles}
            placeholder="Select Logo"
            accept="image/png,image/jpeg,image/svg+xml"
            onChange={(value) => {
              let resultValue = null;
              if (value) {
                resultValue = value;
              } else {
                const logoLink = shareSettings?.data?.logoFile;
                if (logoLink) {
                  resultValue = logoLink;
                } else {
                  resultValue = `/images/rateup-star.svg`;
                }
              }
              dispatch({
                type: "file-input",
                payload: resultValue,
              });
            }}
            value={getLogoFileValueForFileInput(logoFile)}
            clearable
          />
        </Stack>

        <Stack className={styles["option-container"]}>
          <Title order={4} className={styles["option-heading"]}>
            Size
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
            Fill Type
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
            Border Radius
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
        <Stack className={styles["option-container"]}>
          <Title order={4} className={styles["option-heading"]}>
            Background Color
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
                label="Transparent"
              />
              <Radio classNames={radioStyles} value="color" label="Color" />
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
            Color
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
        {/* </Stack> */}
      </Flex>
    </Stack>
  );
}

export default LogoTabpanel;
