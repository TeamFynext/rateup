import { Switch } from "@mantine/core";
import styles from "./StylesComponent.module.css";

function ConfettiSwitch(confettiEnabled, updateSelectedTabStyle) {
  return (
    <Switch
      h={"fit-content"}
      fw={400}
      size="md"
      label={`${confettiEnabled ? "Confetti Enabled:" : "Confetti Disabled:"}`}
      checked={confettiEnabled}
      color="var(--tertiary-color)"
      onChange={() =>
        updateSelectedTabStyle("confettiEnabled", !confettiEnabled)
      }
      classNames={{
        track: `${!confettiEnabled ? styles["switch-disabled-track"] : ""}`,
        body: styles["switch-body"],
      }}
      labelPosition="left"
    />
  );
}

export default ConfettiSwitch;
