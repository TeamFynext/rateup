import {
  FileInput,
  Flex,
  Grid,
  Radio,
  Slider,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import styles from "./LogoTabPanel.module.css";
import fileInputStyles from "./FileInput.module.css";
import radioStyles from "./Radio.module.css";
import { RateupButtonSecondary } from "../../../../Button/RateupButtons";
import ChipGroup from "./ChipGroup";
import { logoFillTypes, logoFilters } from "./constants";
import CustomColorPicker from "../../components/CustomColorPicker";
import { useState } from "react";

function LogoTabpanel({
  handleLogoInputChange,
  logoFillType,
  setLogoFillType,
  qrBgColor,
  setQRBgColor,
  qrColor,
  setQRColor,
  logoSize,
  setLogoSize,
  borderRadius,
  setBorderRadius,
}) {
  const [qrBgColorType, setQRBgColorType] = useState("color");

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
              onChange={handleLogoInputChange}
              clearable
            />
          </Stack>

          <Stack className={styles["option-container"]}>
            <Title order={4} className={styles["option-heading"]}>
              Size
            </Title>
            <Slider
              value={logoSize}
              onChange={setLogoSize}
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
              handleChange={setLogoFillType}
            />
          </Stack>
        </Stack>

        <Stack style={{ gap: "2rem" }}>
          <Stack className={styles["option-container"]}>
            <Title order={4} className={styles["option-heading"]}>
              Border Radius
            </Title>
            <Slider
              value={borderRadius}
              onChange={setBorderRadius}
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
                  setQRBgColor("transparent");
                } else {
                  setQRBgColor("#FFFFFF");
                }
                setQRBgColorType(value);
              }}
              value={qrBgColorType}
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
            {qrBgColorType === "color" && (
              <CustomColorPicker value={qrBgColor} onChange={setQRBgColor} />
            )}
          </Stack>
          <Stack className={styles["option-container"]}>
            <Title order={4} className={styles["option-heading"]}>
              Color
            </Title>
            <CustomColorPicker value={qrColor} onChange={setQRColor} />
          </Stack>
        </Stack>
      </Flex>
    </Stack>
  );
}

export default LogoTabpanel;
