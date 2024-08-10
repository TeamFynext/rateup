import { Tabs, TabsList, TabsTab } from "@mantine/core";

import { TabEnum } from "../SurveyId";
import styles from "../SurveyTheme/components/PageSelector/PageSelector.module.css";

function TabsListComp({ value, onChange }) {
  return (
    <Tabs
      value={value}
      onChange={onChange}
      classNames={styles}
      className="tabs-list-comp-tabs"
    >
      <TabsList>
        <TabsTab value={TabEnum.Edit}>Edit</TabsTab>
        <TabsTab value={TabEnum.Settings}>Settings</TabsTab>
        <TabsTab value={TabEnum.Share}>Share</TabsTab>
        <TabsTab value={TabEnum.Result}>Result</TabsTab>
      </TabsList>
    </Tabs>
  );
}

export default TabsListComp;
