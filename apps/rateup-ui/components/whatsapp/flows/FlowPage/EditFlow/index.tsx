import { Box, Button } from "@mantine/core";
import styles from "./EditFlow.module.css";
import FlowScreensList from "../FlowScreensList";
import { FlowJsonObjContext } from "./FlowJsonObjContext";
import { useImmer } from "use-immer";

function EditFlow(props) {
  const [flowJsonObj, setFlowJsonObj] = useImmer({
    version: "3.1",
    screens: [],
  });

  return (
    <Box className={styles["edit-flow-root-div"]}>
      <FlowJsonObjContext.Provider value={{ flowJsonObj, setFlowJsonObj }}>
        <Box className={styles["editor-container"]}>
          <FlowScreensList />
        </Box>
      </FlowJsonObjContext.Provider>

      <Box className={styles["preview-container"]}></Box>
    </Box>
  );
}

export default EditFlow;
