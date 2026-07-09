import { TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

import styles from "../../Survey/SurveyTheme/components/PageSelector/PageSelector.module.css";

function TabsListComp() {
  return (
    <div className="tabs-list-comp-tabs">
      <TabsList className={styles.list}>
        <TabsTrigger value="links">Links</TabsTrigger>
        <TabsTrigger value="theme">Theme</TabsTrigger>
        <TabsTrigger value="share">Share</TabsTrigger>
        <TabsTrigger value="stats">Stats</TabsTrigger>
      </TabsList>
    </div>
  );
}

export default TabsListComp;
