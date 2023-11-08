import React from "react";
import { Tabs, TabsProps } from "@mantine/core";
interface TabsCommonProps {
  tabHeading: string[];
}
const TabsCommon = (props: TabsProps & TabsCommonProps) => {
  const { children, tabHeading } = props;

  return (
    <Tabs variant="pills" radius="xs" {...props}>
      <Tabs.List>
        {tabHeading?.map((heading: string) => (
          <Tabs.Tab value={heading} key={heading}>
            {heading}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {children}
    </Tabs>
  );
};

export default TabsCommon;
