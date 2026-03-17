"use client";

import { Tabs, TabsList, TabsTab } from "@mantine/core";
import { useExtracted } from "next-intl";

import styles from "../../Survey/SurveyTheme/components/PageSelector/PageSelector.module.css";

function TabsListComp({ value, onChange }) {
  const translations = useExtracted();
  return (
    <Tabs
      value={value}
      onChange={onChange}
      classNames={styles}
      className="tabs-list-comp-tabs"
    >
      <TabsList>
        <TabsTab value="edit">{translations("Edit")}</TabsTab>
        <TabsTab value="share">{translations("Share")}</TabsTab>
        <TabsTab value="stats">{translations("Stats")}</TabsTab>
      </TabsList>
    </Tabs>
  );
}

export default TabsListComp;
