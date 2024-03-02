import {
  ActionIcon,
  Box,
  Group,
  Text,
  Title,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import ScreenListItem from "./ScreenListItem";
import styles from "./FlowScreensList.module.css";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconChevronsDown,
  IconChevronsUp,
  IconPlus,
} from "@tabler/icons-react";
import { useDisclosure, useListState } from "@mantine/hooks";
import CreateFlowScreenModal from "./CreateFlowScreenModal";
import { useContext, useState } from "react";
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
import { RateupButtonBlue } from "../../../../Button/RateupButtons";

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

  const [expandedIds, setExpandedIds] = useState<string[]>(
    flowJson.screens[0] ? [flowJson.screens[0].id] : [],
  );

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

  function handleFoldAll() {
    setExpandedIds([]);
  }
  function handleOpenAll() {
    setExpandedIds(flowJson.screens.map((s) => s.id));
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
      <Group justify={"space-between"} align={"center"} mb={"sm"}>
        <Group gap={8}>
          <Title order={2}>Screens</Title>
          <Text c={"dimmed"}>
            {`${flowJson.screens.length}/${FlowMaxScreens}`}
          </Text>
        </Group>
        <Group gap={8}>
          <Tooltip label="Open all screens" openDelay={500}>
            <ActionIcon variant={"subtle"} onClick={handleOpenAll}>
              <IconChevronsDown />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Fold all screens" openDelay={500}>
            <ActionIcon variant={"subtle"} onClick={handleFoldAll}>
              <IconChevronsUp />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
      <RateupButtonBlue
        onClick={handleCreateScreenClick}
        title={"Add Screen"}
        rightIcon={<IconPlus size="1rem" />}
        size="md"
        disabled={!flowEditable}
      />
      <DragDropContext onDragEnd={onDragEnd}>
        <Box className={styles["screens-list-div"]}>
          {flowJson.screens.map((screen) => {
            const expanded = expandedIds.includes(screen.id);
            return (
              <ScreenListItem
                onDeleteElement={onDeleteElement}
                onElementClick={onElementClick}
                key={screen.id}
                screen={screen}
                onAddElementClick={onAddElementClick}
                expanded={expanded}
                setExpanded={() => {
                  setExpandedIds(
                    expanded
                      ? expandedIds.filter((id) => id !== screen.id)
                      : [...expandedIds, screen.id],
                  );
                }}
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
