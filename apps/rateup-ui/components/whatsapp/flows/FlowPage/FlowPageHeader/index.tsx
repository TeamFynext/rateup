import { Box, Tabs } from "@mantine/core";
import styles from "./FlowPageHeader.module.css";
import { headerTabsList } from "../constants";

function FlowPageHeader({ name, setTabState }) {
  return (
    <Box className={styles["flow-page-header"]}>
      <Box className={styles["heading-container"]}>
        <h1 className={styles["flow-page-heading-h1"]}>{name}</h1>
      </Box>
      <Tabs
        defaultValue={headerTabsList[0]}
        classNames={{
          root: styles["tabs-root-div"],
          tab: styles["tabs-tab"],
          list: styles["tabs-list-div"],
        }}
        onChange={setTabState}
      >
        <Tabs.List>
          {headerTabsList.map((tabNameString) => {
            return (
              <Tabs.Tab key={tabNameString} value={tabNameString}>
                {tabNameString}
              </Tabs.Tab>
            );
          })}
        </Tabs.List>
      </Tabs>
      <Box className={styles["empty-div"]}></Box>
    </Box>
  );
}

export default FlowPageHeader;
