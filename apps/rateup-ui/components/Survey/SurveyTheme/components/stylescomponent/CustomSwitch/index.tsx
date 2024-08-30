import { Switch } from "@mantine/core";

import styles from "./CustomSwitch.module.css";

function CustomSwitch({ className = "", checked, onChange, label }) {
  return (
    <Switch
      className={className}
      checked={checked}
      label={label}
      classNames={{
        track: `${!checked ? styles["switch-disabled-track"] : ""}`,
        body: styles["switch-body"],
      }}
      labelPosition="left"
      size="md"
      onChange={onChange}
    />
  );
}

export default CustomSwitch;
