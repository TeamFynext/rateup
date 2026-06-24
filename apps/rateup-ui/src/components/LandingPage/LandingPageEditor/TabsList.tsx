import { Tabs, TabsList, TabsTab } from "@mantine/core";
import { useTranslation } from "react-i18next";

import styles from "../../Survey/SurveyTheme/components/PageSelector/PageSelector.module.css";

function TabsListComp({ value, onChange }) {
  const { t: translations } = useTranslation();
  return (
    <Tabs value={value} onChange={onChange} classNames={styles} className="tabs-list-comp-tabs">
      <TabsList>
        <TabsTab value="edit">{translations("Edit")}</TabsTab>
        <TabsTab value="share">{translations("Share")}</TabsTab>
        <TabsTab value="stats">{translations("Stats")}</TabsTab>
      </TabsList>
    </Tabs>
  );
}

export default TabsListComp;
