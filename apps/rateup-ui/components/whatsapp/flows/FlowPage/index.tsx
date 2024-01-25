import { useRouter } from "next/router";
import styles from "./FlowPage.module.css";
import { Box, LoadingOverlay, MantineProvider } from "@mantine/core";
import { whatsappTheme } from "../../../../config/mantineTheme";
import FlowPageHeader from "./FlowPageHeader";
import FlowPageBody from "./FlowPageBody";
import { useState } from "react";
import { headerTabsList } from "./constants";
import { useWaFlowFromDb } from "../../../../backend/whatsapp/flow/flow.query";
import CenteredSpinner from "../../../Loaders/CenteredSpinner";

function FlowPage() {
  const router = useRouter();
  const { dbFlowId } = router.query as { dbFlowId: string };
  const { data: flow, isPending, isError } = useWaFlowFromDb(dbFlowId);

  const [tabState, setTabState] = useState(headerTabsList[0]);

  if (isPending || !flow) return <CenteredSpinner />;

  let componentToBeRendered = null;
  if (isPending) {
    componentToBeRendered = <LoadingOverlay visible />;
  } else if (isError) {
    componentToBeRendered = <p>Unable to load data</p>;
  } else if (flow) {
    componentToBeRendered = (
      <Box className={styles["flow-page-content"]}>
        <FlowPageHeader name={flow.name} setTabState={setTabState} />
        <FlowPageBody flowDataObj={flow} tabState={tabState} />
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
