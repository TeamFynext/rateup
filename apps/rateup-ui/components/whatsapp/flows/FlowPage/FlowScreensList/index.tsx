import { Box, Button, TextInput } from "@mantine/core";
import ScreenListItem from "./ScreenListItem";
import styles from "./FlowScreensList.module.css";
import { IconPlus } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import CreateFlowScreenModal from "./CreateFlowScreenModal";
import { Updater, useImmer } from "use-immer";
import { WaFlowJson } from "../../../../../types/global";
import { useContext } from "react";
import { EditFlowContext } from "../EditFlow/EditFlowContext";
import { DragDropContext } from "@hello-pangea/dnd";
import {
  getFormObjFromScreenId,
  getScreenObjById,
} from "../../../../../utils/whatsapp/flow.utils";
import { reorder } from "../../../../../utils/questions";
import { getFlowFormElementsFromScreen } from "../../../../../utils/whatsapp/flow.utils";
import { WaFlowFormElementType } from "../../../../../types/enums";

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

  const [
    isCreateFlowScreenModalOpen,
    { open: openCreateFlowScreenModal, close: closeCreateFlowScreenModal },
  ] = useDisclosure(false);

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
      <h1 className={styles["heading-h1"]}>Screens</h1>
      <Button
        leftSection={<IconPlus size={"1rem"} />}
        onClick={openCreateFlowScreenModal}
        mb="sm"
      >
        Add Screen
      </Button>
      <DragDropContext onDragEnd={onDragEnd}>
        <Box className={styles["screens-list-div"]}>
          {flowJson.screens.map((screen) => {
            return (
              <ScreenListItem
                onDeleteElement={onDeleteElement}
                onElementClick={onElementClick}
                key={screen.id}
                screen={screen}
                onAddElementClick={onAddElementClick}
              />
            );
          })}
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
