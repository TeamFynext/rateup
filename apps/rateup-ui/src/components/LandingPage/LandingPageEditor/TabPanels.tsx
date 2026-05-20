import { Tabs, TabsPanel } from "@mantine/core";

import Editor from "./Editor/index.tsx";
import styles from "./LandingPageEditor.module.css";
import SharePage from "./SharePage/index.tsx";
import Stats from "./Stats/index.tsx";

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
