import { Box, Group, Text, useMantineTheme } from "@mantine/core";
import ScreenListItem from "./ScreenListItem";
import styles from "./FlowScreensList.module.css";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import CreateFlowScreenModal from "./CreateFlowScreenModal";
import { useContext } from "react";
import { EditFlowContext } from "../EditFlow/EditFlowContext";
import { DragDropContext } from "@hello-pangea/dnd";
import {
  getFormObjFromScreenId,
  getScreenObjById,
} from "../../../../../utils/whatsapp/flow.utils";
import { reorder } from "../../../../../utils/questions";
import { getFlowFormElementsFromScreen } from "../../../../../utils/whatsapp/flow.utils";
import {
  WaFlowFormElementType,
  WaFlowStatus,
} from "../../../../../types/enums";
import { FlowMaxScreens } from "../../../whatsappConfig";
import { showErrorToast } from "../../../../../utils/notifications";
import { useRouter } from "next/router";
import { useWaFlowFromDb } from "../../../../../backend/whatsapp/flow/flow.query";

interface FlowScreensListProps {
  onAddElementClick: (screenId: string) => void;
  onElementClick: (id: string, screenId: string) => void;
  onDeleteElement: (id: string, screenId: string) => void;
}
function FlowScreensList({
  onAddElementClick,
  onElementClick,
  onDeleteElement,
}: FlowScreensListProps) {
  const { flowJson, updateFlowJson } = useContext(EditFlowContext);
  const router = useRouter();
  const theme = useMantineTheme();
  const dbFlowId = router.query.dbFlowId as string;
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);

  const flowEditable = dbFlow?.status === WaFlowStatus.DRAFT;

  const [
    isCreateFlowScreenModalOpen,
    { open: openCreateFlowScreenModal, close: closeCreateFlowScreenModal },
  ] = useDisclosure(false);

  function handleCreateScreenClick() {
    if (flowJson.screens.length >= FlowMaxScreens) {
      showErrorToast(`You can only have ${FlowMaxScreens} screens`);
    } else {
      openCreateFlowScreenModal();
    }
  }

  function onDragEnd({ destination, source }) {
    if (!destination) return;
    if (
      destination.index === source.index &&
      destination.droppableId === source.droppableId
    )
      return;
    if (destination.droppableId === source.droppableId) {
      const screen = getScreenObjById(
        flowJson.screens,
        destination.droppableId,
      );
      const elements = getFlowFormElementsFromScreen(screen);

      const newOrder = reorder(elements, source.index, destination.index);

      const form = getFormObjFromScreenId(
        flowJson.screens,
        destination.droppableId,
      );
      const footer = form.children.find(
        (child) => child.type === WaFlowFormElementType.footer,
      );

      updateFlowJson((draft) => {
        const form = getFormObjFromScreenId(
          draft.screens,
          destination.droppableId,
        );
        form.children = [...newOrder, footer];
      });
    } else {
      console.error("Inter-screen dragging Not implemented");
    }
  }

  return (
    <Box className={styles["flow-screens-list-container"]}>
      {flowEditable || (
        <Group
          justify="center"
          style={{
            borderRadius: "4px",
            backgroundColor: theme.colors.red[1],
          }}
          p="4"
        >
          <IconAlertTriangle color={theme.colors.red[9]} />
          <Text
            style={{
              color: theme.colors.red[9],
            }}
          >
            Cannot Edit a Published Flow
          </Text>
        </Group>
      )}
      <DragDropContext onDragEnd={onDragEnd}>
        <Box className={styles["screens-list-div"]}>
          <ScreenListItem
            onDeleteElement={onDeleteElement}
            onElementClick={onElementClick}
            screens={flowJson.screens}
            onAddElementClick={onAddElementClick}
            handleCreateScreenClick={handleCreateScreenClick}
          />
        </Box>
      </DragDropContext>
      <CreateFlowScreenModal
        opened={isCreateFlowScreenModalOpen}
        close={closeCreateFlowScreenModal}
      />
    </Box>
  );
}

export default FlowScreensList;
