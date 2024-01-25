import { Box, Tabs } from "@mantine/core";
import styles from "./FlowPageBody.module.css";
import { tabPanelsList } from "../constants";
import EditFlow from "../EditFlow/EditFlow";

function FlowPageBody(props) {
  const { tabState, ...remaningProps } = props;

  return (
    <Box className={styles["flow-page-body"]}>
      <Tabs value={tabState} h={"100%"}>
        <Tabs.Panel value="Edit" h={"100%"}>
          <EditFlow {...remaningProps} />
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}

export default FlowPageBody;
