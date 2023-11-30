import { Flex, Grid, Slider, Stack, Text, Title } from "@mantine/core";
import styles from "./LogoTabPanel.module.css";
import { RateupButtonSecondary } from "../../../../Button/RateupButtons";
import ChipGroup from "./ChipGroup";
import { logoFillTypes, logoFilters } from "./constants";
import CustomColorPicker from "../../components/CustomColorPicker";

function LogoTabpanel({
  handleLogoInputFormReset,
  handleLogoInputChange,
  removeLogo,
  qrBgBrightness,
  setQRBgBrightness,
  qrBgContrast,
  setQRBgContrast,
  logoFillType,
  setLogoFillType,
  qrBgColor,
  setQRBgColor,
  qrColor,
  setQRColor,
}) {
  return (
    <Stack className={styles["panel-container"]}>
      <Title order={3} className={styles["panel-heading"]}>
        Logo Options
      </Title>

      <Flex className={styles["logo-tab-options-container"]}>
        <Stack>
          <Stack className={styles["option-container"]}>
            <Title order={4} className={styles["option-heading"]}>
              Image
            </Title>
            <form
              onReset={handleLogoInputFormReset}
              className={styles["upload-qr-background-logo-form"]}
            >
              <label
                className={styles["qr-background-logo-label"]}
                htmlFor="qr-background-logo"
              >
                Upload Logo
              </label>
              <input
                id="qr-background-logo"
                className={styles["qr-background-logo"]}
                type="file"
                onChange={handleLogoInputChange}
                accept="image/jpg,image/jpeg,image/png,image/svg+xml"
              />
              <RateupButtonSecondary
                className={"qr-background-logo-remove-btn"}
                title="Remove Logo"
                size="sm"
                onClick={removeLogo}
                type="reset"
              />
            </form>
          </Stack>

          <Stack className={styles["option-container"]}>
            <Title order={4} className={styles["option-heading"]}>
              Filter
            </Title>
            <Stack>
              <Text>Brightness</Text>
              <Slider
                value={qrBgBrightness}
                onChange={setQRBgBrightness}
                label={(value) => value}
                step={0.1}
                defaultValue={1}
                min={0}
                max={2}
              />
            </Stack>
            <Stack>
              <Text>Contrast</Text>
              <Slider
                value={qrBgContrast}
                onChange={setQRBgContrast}
                label={(value) => value}
                step={0.1}
                defaultValue={1}
                min={0}
                max={2}
              />
            </Stack>
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
              Background Color
            </Title>
            <CustomColorPicker value={qrBgColor} onChange={setQRBgColor} />
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
