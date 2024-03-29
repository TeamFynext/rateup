import { Tabs, TabsPanel } from "@mantine/core";
import LinksEditor from "./LinksEditor";
import styles from "./LandingPageEditor.module.css";
import ThemeEditor from "./ThemeEditor";
import SharePage from "./SharePage";

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
    </Tabs>
  );
}

export default TabPanelsComp;
