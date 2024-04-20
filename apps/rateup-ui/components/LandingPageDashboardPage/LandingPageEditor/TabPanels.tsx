import { Tabs, TabsPanel } from "@mantine/core";
import LinksEditor from "./LinksEditor";
import styles from "./LandingPageEditor.module.css";
import ThemeEditor from "./ThemeEditor";
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
