import { Tabs, TabsProps } from "@mantine/core";
import classes from "./StyledTabs.module.css";
export default function StyledTabs(props: Readonly<TabsProps>) {
  return (
    <Tabs
      keepMounted={false}
      classNames={classes}
      styles={{ list: { margin: "auto" } }}
      unstyled
      {...props}
    />
  );
}
