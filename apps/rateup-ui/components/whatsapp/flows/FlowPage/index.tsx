import { useRouter } from "next/router";
import styles from "./FlowPage.module.css";
import { useGetSingleFlow } from "../../../../backend/whatsapp/flows/waFlows.query";
import { Box, LoadingOverlay, MantineProvider, Tabs } from "@mantine/core";
import { whatsappTheme } from "../../../../config/mantineTheme";
import FlowPageHeader from "./FlowPageHeader";
import FlowPageBody from "./FlowPageBody";
import { useState } from "react";
import { headerTabsList } from "./constants";

function FlowPage() {
  const router = useRouter();
  const { flowId } = router.query;
  const { data: flowDataObj, isPending, isError } = useGetSingleFlow(flowId);

  const [tabState, setTabState] = useState(headerTabsList[0]);

  const { name = "" } = flowDataObj ? flowDataObj : {};

  let componentToBeRendered = null;
  if (isPending) {
    componentToBeRendered = <LoadingOverlay visible />;
  } else if (isError) {
    componentToBeRendered = <p>Unable to load data</p>;
  } else if (flowDataObj) {
    componentToBeRendered = (
      <Box className={styles["flow-page-content"]}>
        <FlowPageHeader name={name} setTabState={setTabState} />
        <FlowPageBody flowDataObj={flowDataObj} tabState={tabState} />
      </Box>
    );
  }

  return (
    <MantineProvider theme={whatsappTheme}>
      <Box className={styles["flow-page-container"]}>
        {componentToBeRendered}
      </Box>
    </MantineProvider>
  );
}

export default FlowPage;
