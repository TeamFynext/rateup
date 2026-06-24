import { Tabs, TabsPanel } from "@mantine/core";

import LinksEditor from "./LinksEditor/index.tsx";
import SharePage from "./SharePage/index.tsx";
import Stats from "./Stats/index.tsx";
import ThemeEditor from "./ThemeEditor/index.tsx";

import styles from "./LinktreeEditor.module.css";

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
      <TabsPanel value="links">
        <LinksEditor />
      </TabsPanel>
      <TabsPanel value="theme">
        <ThemeEditor />
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
