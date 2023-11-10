import { Flex, Title } from "@mantine/core";
import styles from "./LogoTabPanel.module.css";
import { RateupButtonSecondary } from "../../../../Button/RateupButtons";
import ChipGroup from "./ChipGroup";
import { logoFillTypes, logoFilters } from "./constants";

function LogoTabpanel({
  handleLogoInputFormReset,
  handleLogoInputChange,
  removeLogo,
  logoFilter,
  setLogoFilter,
  logoFillType,
  setLogoFillType,
}) {
  return (
    <>
      <Title order={3} className={styles["panel-heading"]}>
        Logo Options
      </Title>

      <Flex className={styles["logo-tab-options-container"]}>
        <Flex className={styles["option-container"]}>
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
        </Flex>

        <Flex className={styles["option-container"]}>
          <Title order={4} className={styles["option-heading"]}>
            Filter
          </Title>
          <ChipGroup
            multiple={false}
            chipsData={logoFilters}
            value={logoFilter}
            handleChange={setLogoFilter}
          />
        </Flex>

        <Flex className={styles["option-container"]}>
          <Title order={4} className={styles["option-heading"]}>
            Fill Type
          </Title>
          <ChipGroup
            multiple={false}
            chipsData={logoFillTypes}
            value={logoFillType}
            handleChange={setLogoFillType}
          />
        </Flex>
      </Flex>
    </>
  );
}

export default LogoTabpanel;
