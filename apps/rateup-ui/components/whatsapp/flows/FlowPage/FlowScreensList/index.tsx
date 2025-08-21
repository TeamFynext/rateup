import { useContext, useEffect, useRef } from "react";
import { useRouter } from "next/router";

import { Box, Group, Text, useMantineTheme } from "@mantine/core";
import { useCounter, useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle } from "@tabler/icons-react";
import { DragDropContext } from "@hello-pangea/dnd";
import { useTranslations } from "next-intl";

import { WaFlowFormElement } from "@/types/global";

import { useWaFlowFromDb } from "../../../../../backend/whatsapp/flow/flow.query";
import {
  WaFlowFormElementType,
  WaFlowStatus,
} from "../../../../../types/enums";
import { showErrorToast } from "../../../../../utils/notifications";
import { reorder } from "../../../../../utils/questions";
import {
  getFlowFormElementsFromScreen,
  getFormObjFromScreenId,
  getScreenObjById,
} from "../../../../../utils/whatsapp/flow.utils";
import { FlowMaxScreens } from "../../../whatsappConfig";
import { EditFlowContext } from "../EditFlow/EditFlowContext";
import CreateFlowScreenModal from "./CreateFlowScreenModal";
import styles from "./FlowScreensList.module.css";
import ScreenListItem from "./ScreenListItem";

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
  const { flowJson, updateFlowJson, setScreenNumber } =
    useContext(EditFlowContext);
  const router = useRouter();
  const theme = useMantineTheme();
  const dbFlowId = router.query.dbFlowId as string;
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const firstRender = useRef(null);
  const [pageNo, handlers] = useCounter(0, {
    min: 0,
    max: flowJson?.screens?.length ?? 0,
  });
  const flowEditable = dbFlow?.status === WaFlowStatus.DRAFT;

  const [
    isCreateFlowScreenModalOpen,
    { open: openCreateFlowScreenModal, close: closeCreateFlowScreenModal },
  ] = useDisclosure(false);
  const translations = useTranslations();
  function handleCreateScreenClick() {
    if (flowJson.screens.length >= FlowMaxScreens) {
      showErrorToast(`You can only have ${FlowMaxScreens} screens`);
    } else {
      openCreateFlowScreenModal();
    }
  }
  useEffect(() => {
    if (flowJson?.screens?.length) {
      handlers?.set(firstRender?.current ? flowJson?.screens?.length - 1 : 0);
    }
    if (!firstRender?.current) {
      firstRender.current = "true";
    }
  }, [flowJson?.screens?.length]);

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
      const elements = getFlowFormElementsFromScreen(
        screen,
      ) as WaFlowFormElement[];

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
            {translations("Cannot Edit a Published Flow")}
          </Text>
        </Group>
      )}
      <DragDropContext onDragEnd={onDragEnd}>
        <Box className={styles["screens-list-div"]}>
          <ScreenListItem
            onDeleteElement={onDeleteElement}
            onElementClick={onElementClick}
            screen={flowJson.screens?.[pageNo]}
            onAddElementClick={onAddElementClick}
            handleCreateScreenClick={handleCreateScreenClick}
            pageNo={pageNo}
            handlers={handlers}
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
