import { useRouter } from "next/router";
import styles from "./FlowPage.module.css";
import { useGetSingleFlow } from "../../../../backend/whatsapp/flows/waFlows.query";
import { Box, LoadingOverlay, MantineProvider, Tabs } from "@mantine/core";
import { headerTabsList } from "./constants";
import { whatsappTheme } from "../../../../config/mantineTheme";

function FlowPage() {
  const router = useRouter();
  const { flowId } = router.query;
  const { data: flowDataObj, isPending, isError } = useGetSingleFlow(flowId);

  const { name = "" } = flowDataObj ? flowDataObj : {};

  let componentToBeRendered = null;
  if (isPending) {
    componentToBeRendered = <LoadingOverlay visible />;
  } else if (isError) {
    componentToBeRendered = <p>Unable to load data</p>;
  } else if (flowDataObj) {
    componentToBeRendered = (
      <Box className={styles["flow-page-content"]}>
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
