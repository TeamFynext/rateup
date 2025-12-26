import { Tabs, TabsList, TabsTab } from "@mantine/core";

import styles from "../SurveyTheme/components/PageSelector/PageSelector.module.css";

function TabsListComp({ value, onChange, tabs }) {
  return (
    <Tabs value={value} onChange={onChange} classNames={styles} variant="pills">
      <TabsList>
        {tabs.map((tab) => (
          <TabsTab value={tab} key={tab} tt={"capitalize"}>
            {tab}
          </TabsTab>
        ))}
      </TabsList>
    </Tabs>
  );
}

export default TabsListComp;
