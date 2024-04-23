import { Draggable, Droppable } from "@hello-pangea/dnd";
import {
  ActionIcon,
  Badge,
  Box,
  Flex,
  Group,
  ScrollAreaAutosize,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useCounter, useDisclosure } from "@mantine/hooks";
import {
  IconChevronLeft,
  IconChevronRight,
  IconGripVertical,
  IconPlus,
  IconReplace,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";
import { useReplaceQuestionsMutation } from "../../../../../backend/surveys/questions/questions.query";
import { useWaFlowFromDb } from "../../../../../backend/whatsapp/flow/flow.query";
import {
  WaFlowFormElementType,
  WaFlowStatus,
} from "../../../../../types/enums";
import { WaFlowFormElement, WaFlowScreen } from "../../../../../types/global";
import { showErrorToast } from "../../../../../utils/notifications";
import {
  getFlowElementText,
  getFlowFooterElementsFromScreen,
  getFlowFormElementsFromScreen,
  getFormObjFromScreenId,
  getQuestionsFromScreen,
  getScreenObjById,
  moveFlowScreen,
  updateFlowJsonNavigationAndDataPassing,
} from "../../../../../utils/whatsapp/flow.utils";
import ConfirmationModal from "../../../../Modal/ConfirmationModal";
import dndClasses from "../../../../Survey/Question/DraggableQuestionCard/DraggableQuestionCard.module.css";
import { EditableText } from "../../../../input/EditableText";
import {
  FlowMaxElementsPerScreen,
  FlowMaxScreens,
} from "../../../whatsappConfig";
import { EditFlowContext } from "../EditFlow/EditFlowContext";
import SortDrawerFlow from "../../sortDrawer/SortDrawerFlow";

interface ScreenListItemProps {
  screens: WaFlowScreen[];
  onAddElementClick: (screenId: string) => void;
  onElementClick: (feId: string, screenId: string) => void;
  onDeleteElement: (feId: string, screenId: string) => void;
  handleCreateScreenClick: () => void;
}
function ScreenListItem({
  screens,
  onAddElementClick,
  onElementClick,
  onDeleteElement,
  handleCreateScreenClick,
}: Readonly<ScreenListItemProps>) {
  const [editingItem, setEditingItem] = useState(null); // editing screen id (titleEdit)
  const [editingItemForFooter, setEditingItemFooter] = useState(null);
  const {
    survey,
    flowJson,
    updateFlowJson,
    map,
    updateMap,
    selectedFormElementId,
    setSelectedFormElementId,
    updateSurvey,
    setScreenNumber,
  } = useContext(EditFlowContext);
  const router = useRouter();
  const dbFlowId = router.query.dbFlowId as string;
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const replaceQuestionsMutation = useReplaceQuestionsMutation(survey.id);
  const flowEditable = dbFlow?.status === WaFlowStatus.DRAFT;
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const [isOpen, { open, close }] = useDisclosure(false);

  const [pageNo, handlers] = useCounter(0, {
    min: 0,
    max: flowJson?.screens?.length - 1 ?? 0,
  });

  let screen = screens?.[pageNo];
  const currentScreenIndex = flowJson.screens.findIndex(
    (s) => s.id === screen.id,
  );

  const elements = getFlowFormElementsFromScreen(screen);
  const footerElement = getFlowFooterElementsFromScreen(screen)?.[0];
  const [footerLabel, setFooterLabel] = useState(
    footerElement.label ?? "Continue",
  );

  useEffect(() => {
    if (typeof pageNo === "number") setScreenNumber(pageNo);
  }, [pageNo, setScreenNumber]);

  const handleDeleteScreen = () => {
    if (!flowEditable) return;
    setSelectedFormElementId(null);
    updateFlowJson((draft) => {
      const questions = getQuestionsFromScreen(screen, survey, map);
      const qIds = questions?.map((q) => q.id);
      const updatedQuestions = survey.questions.filter(
        (q) => !qIds.includes(q.id),
      );
      replaceQuestionsMutation.mutate(updatedQuestions);
      updateSurvey((draft) => {
        draft.questions = updatedQuestions;
      });
      const screenIndex = draft.screens.findIndex((s) => s.id === screen.id);
      draft.screens.splice(screenIndex, 1);
      updateFlowJsonNavigationAndDataPassing(draft, dbFlow);
    });
    const feNames = getFlowFormElementsFromScreen(screen, true).map(
      (fe) => fe.name,
    );
    updateMap((draft) => {
      for (const feName of feNames) {
        delete draft[feName];
      }
    });
  };

  if (!survey) return null;

  function updateScreenTitle(title: string) {
    if (!flowEditable) return;
    updateFlowJson((draft) => {
      const screenToBeEdited = getScreenObjById(draft.screens, screen.id);
      screenToBeEdited["title"] = title;
    });
  }

  const handleButtonTextUpdate = () => {
    if (!flowEditable) return;
    updateFlowJson((draft) => {
      const formEl = getFormObjFromScreenId(draft.screens, screen.id);
      const footer = formEl.children.filter(
        (data) => data.type === "Footer",
      )?.[0];
      footer.label = footerLabel;
    });
  };

  function handleAddElementClick() {
    if (!flowEditable) return;
    const elements = getFlowFormElementsFromScreen(screen);
    if (elements.length >= FlowMaxElementsPerScreen) {
      showErrorToast(
        `Maximum ${FlowMaxElementsPerScreen} elements allowed per screen`,
      );
    } else {
      onAddElementClick(screen.id);
    }
  }

  function handleDeleteFormElement(index: number) {
    if (!flowEditable) return;
    const element = elements[index];
    onDeleteElement(element.id, screen.id);
  }

  function handleElementClick(index: number) {
    const element = elements[index];
    onElementClick(element.id, screen.id);
  }

  function handleMoveScreen(action: "up" | "down") {
    updateFlowJson((draft) => {
      if (action === "up") {
        moveFlowScreen(screen.id, currentScreenIndex - 1, draft);
      } else if (action === "down") {
        moveFlowScreen(screen.id, currentScreenIndex + 2, draft);
      }
    });
  }
  return (
    <Stack p="xs" key={screen.id} justify="space-between" h={"100%"}>
      <Box mah={"85%"}>
        <Text w={"100%"} ta={"center"}>
          Page Name
        </Text>
        <ConfirmationModal
          forDeleteFunctionality
          opened={dialogOpened}
          onClose={closeDialog}
          headerLabel={`Are you sure you want to delete this Screen? It will also delete all
        the elements in this screen.`}
          headerTitle="Delete Screen?"
          confirmLabel="Delete"
          onConfirm={handleDeleteScreen}
        />
        <Group gap={5}>
          <Tooltip label="Previous Screen">
            <ActionIcon
              onClick={handlers.decrement}
              radius={"lg"}
              disabled={pageNo === 0}
            >
              <IconChevronLeft size={20} />
            </ActionIcon>
          </Tooltip>
          <EditableText
            text={screen.title}
            setText={updateScreenTitle}
            id={screen.title}
            editMode={flowEditable && editingItem === screen.title}
            setEditingItem={setEditingItem}
            placeholder="Section title (Required if more than one section is added)"
            style={{
              flex: 1,
              fontWeight: "bold",
              fontSize: "1.2rem",
            }}
          />
          <Tooltip label="Next Screen">
            <ActionIcon
              onClick={handlers.increment}
              radius={"lg"}
              disabled={pageNo === flowJson?.screens?.length - 1}
            >
              <IconChevronRight size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Group mx={"xl"} justify="space-between">
          <Group gap={4}>
            <Tooltip label="Add Screen" openDelay={500}>
              <ActionIcon
                onClick={handleCreateScreenClick}
                variant="subtle"
                disabled={!flowEditable}
              >
                <IconPlus />
              </ActionIcon>
            </Tooltip>
            {flowEditable && (
              <>
                <Tooltip label="Delete Screen">
                  <ActionIcon onClick={toggle} variant="subtle">
                    <IconTrash size={20} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Swap order of screens" openDelay={500}>
                  <ActionIcon onClick={open} variant={"subtle"} size={20}>
                    <IconReplace size={20} />
                  </ActionIcon>
                </Tooltip>
              </>
            )}
          </Group>
          <Text c={"dimmed"}>
            {`${flowJson.screens.length}/${FlowMaxScreens}`}
          </Text>
        </Group>
        <ScrollAreaAutosize mah={"88%"}>
          <Droppable droppableId={screen.id} direction="vertical">
            {(provided) => (
              <Stack
                pt="lg"
                px={"xs"}
                gap={0}
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {elements.map((element, index) => {
                  if (element.type === WaFlowFormElementType.footer) return;
                  return (
                    <DraggableFormElementCard
                      fe={element}
                      key={element.id}
                      text={getFlowElementText(element, survey.questions, map)}
                      selected={selectedFormElementId === element.id}
                      index={index}
                      handleOpen={handleElementClick}
                      handleDelete={handleDeleteFormElement}
                    />
                  );
                })}
                {provided.placeholder}
              </Stack>
            )}
          </Droppable>
          <Group
            style={{
              border: ".0625rem solid var(--mantine-color-gray-4)",
              borderRadius: "12px",
              cursor: "pointer",
            }}
            h={35}
            m={"md"}
            onClick={handleAddElementClick}
          >
            <ActionIcon
              h={"100%"}
              style={{
                borderRadius: "10px 0px 0px 10px",
              }}
            >
              <IconPlus size={30} />
            </ActionIcon>
            <Text c="dimmed">Add Questions</Text>
          </Group>
        </ScrollAreaAutosize>
      </Box>
      <Flex w={"100%"} mt={"md"} gap={"xs"}>
        <Box w={"100%"}>
          <Text fz={"xs"}>Next button text</Text>
          <EditableText
            text={footerLabel}
            setText={setFooterLabel}
            setEditingItem={setEditingItemFooter}
            id={screen.title}
            editMode={flowEditable && editingItemForFooter === screen.title}
            placeholder="Next button text"
            handleOnFunction={false}
            handleButtonTextUpdate={handleButtonTextUpdate}
            size="md"
            style={{
              flex: 1,
            }}
          />
        </Box>
      </Flex>
      <SortDrawerFlow
        close={close}
        data={flowJson.screens?.map((data) => ({
          id: data.id,
          name: data.title,
        }))}
        opened={isOpen}
      />
    </Stack>
  );
}

interface FormElementCardProps {
  fe: WaFlowFormElement;
  text: string;
  selected: boolean;
  index: number;
  handleOpen: (index: number) => void;
  handleDelete: (index: number) => void;
  dragHandleProps?: any;
}
function DraggableFormElementCard(
  props: Readonly<Omit<FormElementCardProps, "dragHandleProps">>,
) {
  return (
    <Draggable key={props.fe.id} index={props.index} draggableId={props.fe.id}>
      {(provided, snapshot) => (
        <Box {...provided.draggableProps} ref={provided.innerRef}>
          <FormElementCard
            {...props}
            dragHandleProps={provided.dragHandleProps}
          />
        </Box>
      )}
    </Draggable>
  );
}

// maybe give a name for all text and then remove when uploading to whatsap
function FormElementCard({
  text,
  selected,
  index,
  handleOpen,
  handleDelete,
  dragHandleProps,
}: Readonly<FormElementCardProps>) {
  const router = useRouter();
  const dbFlowId = router.query.dbFlowId as string;
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);

  const flowEditable = dbFlow?.status === WaFlowStatus.DRAFT;

  return (
    <Box
      onClick={() => handleOpen(index)}
      style={{
        backgroundColor: selected ? "var(--light-grey-color)" : "white",
      }}
      className={dndClasses.item}
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
        }}
        {...dragHandleProps}
      >
        <IconGripVertical size={20} stroke={1.5} />
      </div>
      <Badge style={{ minWidth: "30px" }} c={"white"} variant={"filled"}>
        {index + 1}
      </Badge>
      <Text px="xs" fw={500} style={{ flex: 1 }} lineClamp={2}>
        {text}
      </Text>
      {flowEditable && (
        <ActionIcon
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDelete(index);
          }}
          variant="subtle"
          color="gray"
          me={"xs"}
        >
          <IconTrash />
        </ActionIcon>
      )}
    </Box>
  );
}

export default ScreenListItem;
