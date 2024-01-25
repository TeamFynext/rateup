import {
  Box,
  Button,
  Title,
  LoadingOverlay,
  MultiSelect,
  Group,
} from "@mantine/core";
import styles from "./flows.module.css";
import { IconPlus } from "@tabler/icons-react";
import CreateFlowModal from "../../../../components/whatsapp/flows/CreateFlowModal/CreateFlowModal.tsx";
import { useDisclosure } from "@mantine/hooks";
import FlowCardsList from "../../../../components/whatsapp/flows/FlowCardsList";
import NothingFound from "../../../../components/NothingFound/NothingFound";
import { useWaFlowsFromDb } from "../../../../backend/whatsapp/flow/flow.query";
import { SyncFlowsButton } from "../../../../components/whatsapp/flows/SyncFlows";

function Flows() {
  const [
    isCreateFlowModalOpened,
    { open: handleCreateFlowModalOpen, close: handleCreateFlowModalClose },
  ] = useDisclosure(false);
  const { data, isLoading } = useWaFlowsFromDb();
  console.log(data);

  let componentToBeRendered = null;
  if (data && data.length) {
    componentToBeRendered = <FlowCardsList flows={data} />;
  } else if (data && !data.length) {
    componentToBeRendered = <NothingFound text="No Flows Available" />;
  }

  return (
    <Box className={styles["flows-list-page-container"]}>
      <Group justify="space-between">
        <Group>
          <Title className={styles["flows-list-heading-h1"]}>Flows</Title>
          <Button
            rightSection={<IconPlus size={"1rem"} />}
            onClick={handleCreateFlowModalOpen}
          >
            Create a flow
          </Button>
        </Group>
        <SyncFlowsButton />
      </Group>

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
