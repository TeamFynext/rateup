import { Box, Button, Title, LoadingOverlay, MultiSelect } from "@mantine/core";
import { useGetWaFlows } from "../../../../backend/whatsapp/flows/waFlows.query";
import styles from "./flows.module.css";
import { IconPlus } from "@tabler/icons-react";
import CreateFlowModal from "./CreateFlowModal";
import { useDisclosure } from "@mantine/hooks";

function Flows() {
  const [
    isCreateFlowModalOpened,
    { open: handleCreateFlowModalOpen, close: handleCreateFlowModalClose },
  ] = useDisclosure(false);
  const { data, isLoading } = useGetWaFlows();

  console.log(data, "flows test.....");
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
      </Box>

      <CreateFlowModal
        opened={isCreateFlowModalOpened}
        onClose={handleCreateFlowModalClose}
      />
    </Box>
  );
}

export default Flows;
