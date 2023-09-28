import { Tabs, TabsProps, rem } from "@mantine/core";
import classes from './StyledTabs.module.css'
export default function StyledTabs(props: TabsProps) {
    return (
      <Tabs
      classNames={classes}
        unstyled
        {...props}
      />
    );
  }