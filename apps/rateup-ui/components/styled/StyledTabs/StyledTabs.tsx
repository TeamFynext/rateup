import { Tabs, TabsProps } from "@mantine/core";

import classes from "./StyledTabs.module.css";
import classesRateUp from "./StyledTabsRateUp.module.css";

interface StyledTabsProps extends TabsProps {
  enableRateUpBlueTheme?: boolean;
}
export default function StyledTabs(props: Readonly<StyledTabsProps>) {
  const { enableRateUpBlueTheme, ...rest } = props;
  return (
    <Tabs
      keepMounted={false}
      classNames={{
        ...classes,
        ...(enableRateUpBlueTheme ? classesRateUp : {}),
      }}
      styles={{
        list: { margin: "auto" },
      }}
      variant="pills"
      {...rest}
    />
  );
}
