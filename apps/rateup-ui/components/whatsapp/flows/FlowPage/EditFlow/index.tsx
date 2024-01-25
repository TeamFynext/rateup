import { Box, Button, Tabs } from "@mantine/core";
import FlowScreensList from "../FlowScreensList";
import EditFlowScreenQs from "../EditFlowScreenQs";
import { FlowJsonObjContext } from "./FlowJsonObjContext";
import { useImmer } from "use-immer";
import { useState } from "react";
import styles from "./EditFlow.module.css";

export enum EditFlowTabs {
  screensList = "screensList",
  editFlowScreenQs = "editFlowScreenQs",
}

function EditFlow() {
  const [flowJsonObj, setFlowJsonObj] = useImmer({
    version: "3.1",
    screens: [],
  });

  const [activeEditFlowTab, setActiveEditFlowTab] = useState(
    EditFlowTabs.screensList,
  );
  const [editFlowScreenQsScreenId, setEditFlowScreenQsScreenId] = useState("");

  console.log(JSON.stringify(flowJsonObj), "from flowscreens list comp");

  return (
    <Box className={styles["edit-flow-root-div"]}>
      <FlowJsonObjContext.Provider value={{ flowJsonObj, setFlowJsonObj }}>
        <Box className={styles["editor-container"]}>
          <Tabs
            value={activeEditFlowTab}
            classNames={{ root: styles["edit-flow-tabs-root"] }}
          >
            <Tabs.Panel value="screensList">
              <FlowScreensList
                setActiveEditFlowTab={setActiveEditFlowTab}
                setEditFlowScreenQsScreenId={setEditFlowScreenQsScreenId}
              />
            </Tabs.Panel>
            <Tabs.Panel value="editFlowScreenQs">
              <EditFlowScreenQs
                setActiveEditFlowTab={setActiveEditFlowTab}
                screenId={editFlowScreenQsScreenId}
              />
            </Tabs.Panel>
          </Tabs>
        </Box>
      </FlowJsonObjContext.Provider>

      <Box className={styles["preview-container"]}></Box>
    </Box>
  );
}

export default EditFlow;
