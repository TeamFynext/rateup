import { useEffect } from "react";
import { useRouter } from "next/router";

import { Box, Group, Text, useMantineTheme } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle } from "@tabler/icons-react";
import { DragDropContext } from "@hello-pangea/dnd";
import { useTranslations } from "next-intl";

import { WaFlowStatus } from "@/types/enums";
import { useWaFlowFromDb } from "@/backend/whatsapp/flow/flow.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { showErrorToast } from "@/utils/notifications";
import { reorder } from "@/utils/questions";
import { getScreenObjById } from "@/utils/whatsapp/flow.utils";

import { FlowMaxScreens } from "../../whatsappConfig";
import useFlowStore from "../utils/store";
import CreateFlowScreenModal from "./CreateFlowScreenModal";
import styles from "./FlowScreensList.module.css";
import ScreenListItem from "./ScreenListItem";

function FlowScreensList() {
  const router = useRouter();
  const theme = useMantineTheme();
  const dbFlowId = router.query.dbFlowId as string;
  const { data: dbFlow, isPending } = useWaFlowFromDb(dbFlowId);
  const [
    isCreateFlowScreenModalOpen,
    { open: openCreateFlowScreenModal, close: closeCreateFlowScreenModal },
  ] = useDisclosure(false);
  const translations = useTranslations();
  const {
    addScreens,
    setCurrentScreenId,
    screens,
    getScreens,
    updateComponentsInScreen,
    currentScreenId,
  } = useFlowStore();

  useEffect(() => {
    if (dbFlow) {
      addScreens((dbFlow.json.screens || []) as any);
      if (currentScreenId) {
        const screenExists = getScreens().some(
          (screen) => screen.id === currentScreenId,
        );
        if (!screenExists) {
          setCurrentScreenId(dbFlow.json.screens?.[0]?.id);
        } else {
          setCurrentScreenId(currentScreenId);
        }
      } else {
        setCurrentScreenId(dbFlow.json.screens?.[0]?.id);
      }
    }
  }, [dbFlow]);

  if (isPending) {
    return <RateupLoader />;
  }
  function handleCreateScreenClick() {
    if (1 >= FlowMaxScreens) {
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
      const screen = getScreenObjById(screens as any, destination.droppableId);
      const newOrder = reorder(
        screen.layout.children,
        source.index,
        destination.index,
      );
      updateComponentsInScreen(newOrder as any);
    } else {
      console.error("Inter-screen dragging Not implemented");
    }
  }

  return (
    <Box className={styles["flow-screens-list-container"]}>
      <DragDropContext onDragEnd={onDragEnd}>
        <Box className={styles["screens-list-div"]}>
          <ScreenListItem
            handleCreateScreenClick={handleCreateScreenClick}
            pendingSave={dbFlow?.pendingSave}
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
