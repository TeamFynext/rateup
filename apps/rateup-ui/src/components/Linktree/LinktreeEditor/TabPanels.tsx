import { TabsContent } from "@/components/ui/tabs.tsx";

import LinksEditor from "./LinksEditor/index.tsx";
import SharePage from "./SharePage/index.tsx";
import Stats from "./Stats/index.tsx";
import ThemeEditor from "./ThemeEditor/index.tsx";

import styles from "./LinktreeEditor.module.css";

function TabPanelsComp() {
  return (
    <div className={styles["tab-panel-root"]}>
      <TabsContent value="links" className={styles["tab-panel"]}>
        <LinksEditor />
      </TabsContent>
      <TabsContent value="theme" className={styles["tab-panel"]}>
        <ThemeEditor />
      </TabsContent>
      <TabsContent value="share" className={styles["tab-panel"]}>
        <SharePage />
      </TabsContent>
      <TabsContent value="stats" className={`${styles["tab-panel"]} ${styles["stats-tab-panel"]}`}>
        <Stats />
      </TabsContent>
    </div>
  );
}

export default TabPanelsComp;
