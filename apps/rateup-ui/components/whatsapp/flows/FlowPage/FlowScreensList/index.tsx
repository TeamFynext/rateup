import { Box, Button, TextInput } from "@mantine/core";
import ScreenListItem from "./ScreenListItem";
import styles from "./FlowScreensList.module.css";
import { FlowJsonObjContext } from "../EditFlow/FlowJsonObjContext";
import { useCallback, useContext, useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import CreateFlowScreenModal from "./CreateFlowScreenModal";

function FlowScreensList({
  setActiveEditFlowTab,
  setEditFlowScreenQsScreenId,
}) {
  const { flowJsonObj, setFlowJsonObj } = useContext(FlowJsonObjContext);

  const [
    isCreateFlowScreenModalOpen,
    { open: openCreateFlowScreenModal, close: closeCreateFlowScreenModal },
  ] = useDisclosure(false);

  return (
    <Box className={styles["flow-screens-list-container"]}>
      <h1 className={styles["heading-h1"]}>Screens</h1>
      <Box className={styles["add-new-screen-button-div"]}>
        <Button
          leftSection={<IconPlus size={"1rem"} />}
          onClick={openCreateFlowScreenModal}
        >
          Add Screen
        </Button>
      </Box>
      <Box className={styles["screens-list-div"]}>
        {flowJsonObj.screens.map(({ id }) => {
          return (
            <ScreenListItem
              key={id}
              screenId={id}
              setActiveEditFlowTab={setActiveEditFlowTab}
              setEditFlowScreenQsScreenId={setEditFlowScreenQsScreenId}
            />
          );
        })}
      </Box>
      {isCreateFlowScreenModalOpen && (
        <CreateFlowScreenModal
          opened={isCreateFlowScreenModalOpen}
          close={closeCreateFlowScreenModal}
        />
      )}
    </Box>
  );
}

export default FlowScreensList;
