import { Box, Tabs } from "@mantine/core";
import styles from "./FlowPageBody.module.css";
import { tabPanelsList } from "../constants";

function FlowPageBody(props) {
  const { tabState, ...remaningProps } = props;

  return (
    <Box className={styles["flow-page-body"]}>
      <Tabs value={tabState} h={"100%"}>
        {tabPanelsList.map((obj) => {
          const { id, component: Comp, tabValue } = obj;
          return (
            <Tabs.Panel key={id} value={tabValue} h={"100%"}>
              <Comp {...remaningProps} />
            </Tabs.Panel>
          );
        })}
      </Tabs>
    </Box>
  );
}

export default FlowPageBody;
