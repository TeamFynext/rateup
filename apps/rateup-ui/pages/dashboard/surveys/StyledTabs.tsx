import { Tabs, TabsProps, rem } from '@mantine/core';
import classes from './StyledTabs.module.css'
export default function StyledTabs(props: TabsProps) {
  return (
    <Tabs
      unstyled
      classNames={classes}
      {...props}
    />
  );
}

