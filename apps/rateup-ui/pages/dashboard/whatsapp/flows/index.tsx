import { Box, Button, Title, LoadingOverlay, MultiSelect } from "@mantine/core";
import { useGetWaFlows } from "../../../../backend/whatsapp/flows/waFlows.query";
import styles from "./flows.module.css";
import { IconPlus } from "@tabler/icons-react";
import CreateFlowModal from "../../../../components/whatsapp/flows/CreateFlowModal";
import { useDisclosure } from "@mantine/hooks";
import FlowCardsList from "../../../../components/whatsapp/flows/FlowCardsList";
import NothingFound from "../../../../components/NothingFound/NothingFound";

function Flows() {
  const [
    isCreateFlowModalOpened,
    { open: handleCreateFlowModalOpen, close: handleCreateFlowModalClose },
  ] = useDisclosure(false);
  const { data, isLoading } = useGetWaFlows();

  let componentToBeRendered = null;
  if (data && data.length) {
    componentToBeRendered = <FlowCardsList flowObjsArray={data} />;
  } else if (data && !data.length) {
    componentToBeRendered = <NothingFound text="No Flows Available" />;
  }

  return (
    <Box className={styles["flows-list-page-container"]}>
      <Box className={styles["flows-list-header"]}>
        <Title className={styles["flows-list-heading-h1"]}>Flows</Title>
        <Button
          rightSection={<IconPlus size={"1rem"} />}
          onClick={handleCreateFlowModalOpen}
        >
          Create a flow
        </Button>
      </Box>

      <Box className={styles["flows-list-div"]}>
        <LoadingOverlay visible={isLoading} />
        {componentToBeRendered}
      </Box>

      <CreateFlowModal
        opened={isCreateFlowModalOpened}
        onClose={handleCreateFlowModalClose}
      />
    </Box>
  );
}

export default Flows;
