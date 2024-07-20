import { Tabs, TabsList, TabsTab } from "@mantine/core";

import styles from "../../Survey/SurveyTheme/components/PageSelector/PageSelector.module.css";

function TabsListComp({ value, onChange }) {
  return (
    <Tabs
      value={value}
      onChange={onChange}
      classNames={styles}
      className="tabs-list-comp-tabs"
    >
      <TabsList>
        <TabsTab value="edit">Edit</TabsTab>
        <TabsTab value="share">Share</TabsTab>
      </TabsList>
    </Tabs>
  );
}

export default TabsListComp;
