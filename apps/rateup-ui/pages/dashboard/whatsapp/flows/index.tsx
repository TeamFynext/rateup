import { Box, Title, LoadingOverlay, Group } from "@mantine/core";
import styles from "./flows.module.css";
import { IconPlus } from "@tabler/icons-react";
import CreateFlowModal from "../../../../components/whatsapp/flows/CreateFlowModal/CreateFlowModal.tsx";
import { useDisclosure } from "@mantine/hooks";
import FlowCardsList from "../../../../components/whatsapp/flows/FlowCardsList";
import NothingFound from "../../../../components/NothingFound/NothingFound";
import { useWaFlowsFromDb } from "../../../../backend/whatsapp/flow/flow.query";
import { SyncFlowsButton } from "../../../../components/whatsapp/flows/SyncFlows";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";

function Flows() {
  const [
    isCreateFlowModalOpened,
    { open: handleCreateFlowModalOpen, close: handleCreateFlowModalClose },
  ] = useDisclosure(false);
  let { data: flows, isLoading } = useWaFlowsFromDb();

  let componentToBeRendered = null;
  if (flows && flows.length) {
    flows = flows.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    componentToBeRendered = <FlowCardsList flows={flows} />;
  } else if (flows && !flows.length) {
    componentToBeRendered = <NothingFound text="No Flows Available" />;
  }

  return (
    <Box className={styles["flows-list-page-container"]}>
      <Group justify="space-between">
        <Group>
          <Title className={styles["flows-list-heading-h1"]}>Flows</Title>
          <RateupButtonBlue
            title="Create flow"
            rightIcon={<IconPlus size={"1rem"} />}
            onClick={handleCreateFlowModalOpen}
          />
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
