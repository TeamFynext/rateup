import { Switch } from "@mantine/core";
import styles from "./StylesComponent.module.css";

function OrgLogoSwitch({ isOrgLogoEnabled, onChange }) {
  return (
    <Switch
      checked={isOrgLogoEnabled}
      label={"Organization Logo"}
      classNames={{
        track: `${!isOrgLogoEnabled ? styles["switch-disabled-track"] : ""}`,
        body: styles["switch-body"],
      }}
      labelPosition="left"
      size="md"
      onChange={onChange}
    />
  );
}

export default OrgLogoSwitch;
