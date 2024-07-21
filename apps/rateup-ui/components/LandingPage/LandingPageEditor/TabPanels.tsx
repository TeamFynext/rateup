import { Tabs, TabsPanel } from "@mantine/core";

import Editor from "./Editor";
import styles from "./LandingPageEditor.module.css";
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
      <TabsPanel value="edit">
        <Editor />
      </TabsPanel>
      <TabsPanel value="share">
        <SharePage />
      </TabsPanel>
    </Tabs>
  );
}

export default TabPanelsComp;
