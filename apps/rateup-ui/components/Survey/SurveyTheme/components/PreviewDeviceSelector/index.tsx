import { Group, Tabs } from "@mantine/core";
import { IconDeviceDesktop, IconDeviceMobile } from "@tabler/icons-react";

import { PreviewTypeEnum } from "../../SurveyTheme.enums";
import styles from "./PreviewDeviceSelector.module.css";

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
