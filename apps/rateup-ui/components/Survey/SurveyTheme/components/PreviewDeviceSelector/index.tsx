import { Box, Group, Tabs } from "@mantine/core";
import { PreviewTypeEnum } from "../../SurveyTheme.enums";
import { IconDeviceDesktop, IconDeviceMobile } from "@tabler/icons-react";
import styles from "./PreviewDeviceSelector.module.css";
import { SurveyThemeContext } from "../../SurveyThemeContext";

function PreviewDeviceSelector({
  onChange,
  value,
  withLabel = true,
  className = "",
}) {
  return (
    <Group className={`${styles["preview-device-selector-div"]} ${className}`}>
      {withLabel && <p className={styles["label"]}>Preview:</p>}
      <Tabs
        value={value}
        onChange={onChange}
        classNames={styles}
        defaultValue={PreviewTypeEnum.DESKTOP}
      >
        <Tabs.List>
          <Tabs.Tab value={PreviewTypeEnum.DESKTOP}>
            <IconDeviceDesktop size={"1.25rem"} />
          </Tabs.Tab>
          <Tabs.Tab value={PreviewTypeEnum.MOBILE}>
            <IconDeviceMobile size={"1.25rem"} />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>
    </Group>
  );
}

export default PreviewDeviceSelector;
