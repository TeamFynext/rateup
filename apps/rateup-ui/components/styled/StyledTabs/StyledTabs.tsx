import { Tabs, TabsProps } from "@mantine/core";
import classes from "./StyledTabs.module.css";
export default function StyledTabs(props: TabsProps) {
  return (
    <Tabs
      classNames={classes}
      styles={{ list: { margin: "auto" } }}
      unstyled
      {...props}
    />
  );
}
