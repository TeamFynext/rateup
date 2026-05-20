import type { TabsProps } from "@mantine/core";
import { Tabs } from "@mantine/core";

interface TabsCommonProps {
  tabHeading: string[];
}
const TabsCommon = (props: TabsProps & TabsCommonProps) => {
  const { children, tabHeading, ...restData } = props;
  return (
    <Tabs variant="pills" radius="xs" {...restData}>
      <Tabs.List>
        {tabHeading?.map((heading: string) => (
          <Tabs.Tab value={heading} key={heading} tt={"capitalize"} fw={600}>
            {heading}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {/* <MotionTransition
        keyValue={{ id: restData.value ? restData.value : null }}
        duration={0.6}
        apEnable={false}
        type="fade"
      > */}
      {children}
      {/* </MotionTransition> */}
    </Tabs>
  );
};

export default TabsCommon;
