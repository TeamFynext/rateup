import { Box, Group, Tabs } from "@mantine/core";
import { PreviewTypeEnum } from "../../SurveyTheme.enums";
import { IconDeviceDesktop, IconDeviceMobile } from "@tabler/icons-react";
import styles from "./PreviewDeviceSelector.module.css";
import { SurveyThemeContext } from "../../SurveyThemeContext";

function PreviewDeviceSelector({ onChange, value }) {
  return (
    <Group className={styles["preview-device-selector-div"]}>
      <p className={styles["label"]}>Preview:</p>
      <Tabs
        value={value}
        onChange={onChange}
        classNames={styles}
        defaultValue={PreviewTypeEnum.DESKTOP}
      >
        <Tabs.List>
          <Tabs.Tab value={PreviewTypeEnum.DESKTOP}>
            <IconDeviceDesktop />
          </Tabs.Tab>
          <Tabs.Tab value={PreviewTypeEnum.MOBILE}>
            <IconDeviceMobile />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>
    </Group>
  );
}

export default PreviewDeviceSelector;
