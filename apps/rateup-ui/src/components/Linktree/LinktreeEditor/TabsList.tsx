import { Tabs, TabsList, TabsTab } from "@mantine/core";

import styles from "../../Survey/SurveyTheme/components/PageSelector/PageSelector.module.css";

function TabsListComp({ value, onChange }) {
  return (
    <Tabs value={value} onChange={onChange} classNames={styles} className="tabs-list-comp-tabs">
      <TabsList>
        <TabsTab value="links">Links</TabsTab>
        <TabsTab value="theme">Theme</TabsTab>
        <TabsTab value="share">Share</TabsTab>
        <TabsTab value="stats">Stats</TabsTab>
      </TabsList>
    </Tabs>
  );
}

export default TabsListComp;
