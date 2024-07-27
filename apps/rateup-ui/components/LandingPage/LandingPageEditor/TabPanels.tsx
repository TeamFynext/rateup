import { Tabs, TabsPanel } from "@mantine/core";

import Editor from "./Editor";
import styles from "./LandingPageEditor.module.css";
import SharePage from "./SharePage";
import Stats from "./Stats";

function TabPanelsComp({ value }) {
  return (
    <Tabs
      classNames={{
        root: styles["tab-panel-root"],
        panel: styles["tab-panel"],
      }}
      value={value}
      keepMounted={false}
    >
      <TabsPanel value="edit">
        <Editor />
      </TabsPanel>
      <TabsPanel value="share">
        <SharePage />
      </TabsPanel>
      <TabsPanel className={styles["stats-tab-panel"]} value="stats">
        <Stats />
      </TabsPanel>
    </Tabs>
  );
}

export default TabPanelsComp;
