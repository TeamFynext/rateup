import { Box, Button } from "@mantine/core";
import styles from "./FlowScreensList.module.css";
import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useCallback, useContext } from "react";
import { FlowJsonObjContext } from "../EditFlow/FlowJsonObjContext";
import {
  getScreenObjById,
  updateFlowJsonNavigateTerminalScreens,
} from "./utils";
import { useDisclosure } from "@mantine/hooks";
import EditFlowScreenModal from "./CreateFlowScreenModal";
import { EditFlowTabs } from "../EditFlow/EditFlow";

function ScreenListItem({
  screenId,
  setActiveEditFlowTab,
  setEditFlowScreenQsScreenId,
}) {
  const { flowJsonObj, setFlowJsonObj } = useContext(FlowJsonObjContext);

  const [
    isEditFlowScreenModalOpen,
    { open: openEditFlowScreenModal, close: closeEditFlowScreenModal },
  ] = useDisclosure(false);

  const handleDeleteBtnClick = useCallback(() => {
    setFlowJsonObj((draft) => {
      draft.screens = draft.screens.filter((screenObj) => {
        return screenObj.id !== screenId;
      });
      updateFlowJsonNavigateTerminalScreens(draft);
    });
  }, [screenId]);

  const screenObj = getScreenObjById(flowJsonObj.screens, screenId);
  const questionsLength = screenObj?.layout["children"][0]["children"].length;
  const addEditQuestionsBtnText =
    questionsLength > 1 ? "Edit Questions" : "Add Questions";

  return (
    <Box className={styles["screen-list-item"]}>
      <h2 className={styles["screen-id-h2"]}>{screenId}</h2>
      <Box className={styles["screen-action-conainer"]}>
        <Button
          onClick={() => {
            setActiveEditFlowTab(EditFlowTabs.editFlowScreenQs);
            setEditFlowScreenQsScreenId(screenId);
          }}
        >
          {addEditQuestionsBtnText}
        </Button>
        <Button
          leftSection={<IconEdit size={"1rem"} />}
          onClick={openEditFlowScreenModal}
        >
          Edit
        </Button>
        <Button
          leftSection={<IconTrash size={"1rem"} />}
          onClick={handleDeleteBtnClick}
        >
          Delete
        </Button>
      </Box>
      {isEditFlowScreenModalOpen && (
        <EditFlowScreenModal
          opened={isEditFlowScreenModalOpen}
          close={closeEditFlowScreenModal}
          screenId={screenId}
        />
      )}
    </Box>
  );
}

export default ScreenListItem;
