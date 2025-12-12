import { IconDeviceDesktop, IconDeviceMobile } from "@tabler/icons-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PreviewTypeEnum } from "../../SurveyTheme.enums";
import styles from "./PreviewDeviceSelector.module.css";

function PreviewDeviceSelector({
  onChange,
  value,
  withLabel = true,
  className = "",
}) {
  return (
    <div className="">
      {withLabel && <p className={styles["label"]}>Preview:</p>}
      <Tabs
        value={value}
        onValueChange={onChange}
        defaultValue={PreviewTypeEnum.DESKTOP}
      >
        <TabsList className="inline-flex rounded-lg bg-muted p-1">
          <TabsTrigger
            value={PreviewTypeEnum.DESKTOP}
            className="data-[state=active]:bg-primary data-[state=active]:text-white p-2 rounded-md"
            aria-label="Desktop preview"
          >
            <IconDeviceDesktop size="1.25rem" />
          </TabsTrigger>

          <TabsTrigger
            value={PreviewTypeEnum.MOBILE}
            className="data-[state=active]:bg-primary data-[state=active]:text-white p-2 rounded-md"
            aria-label="Mobile preview"
          >
            <IconDeviceMobile size="1.25rem" />
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

export default PreviewDeviceSelector;
