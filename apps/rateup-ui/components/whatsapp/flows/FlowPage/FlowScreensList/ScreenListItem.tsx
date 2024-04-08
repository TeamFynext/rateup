import { Draggable, Droppable } from "@hello-pangea/dnd";
import {
  ActionIcon,
  Badge,
  Box,
  Collapse,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconChevronUp,
  IconGripVertical,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useContext, useRef, useState } from "react";
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
import { RateupButtonBlue } from "../../../../Button/RateupButtons";
import ConfirmationModal from "../../../../Modal/ConfirmationModal";
import dndClasses from "../../../../Survey/Question/DraggableQuestionCard/DraggableQuestionCard.module.css";
import { EditableText } from "../../../../input/EditableText";
import { FlowMaxElementsPerScreen } from "../../../whatsappConfig";
import { EditFlowContext } from "../EditFlow/EditFlowContext";

interface ScreenListItemProps {
  screen: WaFlowScreen;
  onAddElementClick: (screenId: string) => void;
  onElementClick: (feId: string, screenId: string) => void;
  onDeleteElement: (feId: string, screenId: string) => void;
  expanded: boolean;
  setExpanded: () => void;
}
function ScreenListItem({
  screen,
  onAddElementClick,
  onElementClick,
  onDeleteElement,
  expanded,
  setExpanded,
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
  } = useContext(EditFlowContext);
  const router = useRouter();
  const dbFlowId = router.query.dbFlowId as string;
  const { data: dbFlow } = useWaFlowFromDb(dbFlowId);
  const replaceQuestionsMutation = useReplaceQuestionsMutation(survey.id);
  const flowEditable = dbFlow?.status === WaFlowStatus.DRAFT;
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const textInputRef = useRef(null);
  const currentScreenIndex = flowJson.screens.findIndex(
    (s) => s.id === screen.id,
  );

  const elements = getFlowFormElementsFromScreen(screen);
  const footerElement = getFlowFooterElementsFromScreen(screen)?.[0];
  const [footerLabel, setFooterLabel] = useState(
    footerElement.label ?? "Continue",
  );

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
    <Paper
      p="xs"
      shadow="lg"
      key={screen.id}
      style={{
        border: ".0063rem solid rgba(0,0,0,.1)",
        borderRadius: ".5rem",
      }}
    >
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
      <Text fz={"xs"}>Screen name</Text>
      <Group gap={5}>
        <Tooltip label="Move Screen Up" openDelay={500}>
          <ActionIcon
            onClick={() => handleMoveScreen("up")}
            variant={"outline"}
            size={20}
            disabled={currentScreenIndex === 0}
          >
            <IconChevronUp size={20} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Move Screen Down" openDelay={500}>
          <ActionIcon
            onClick={() => handleMoveScreen("down")}
            variant={"outline"}
            size={20}
            disabled={currentScreenIndex === flowJson.screens.length - 1}
          >
            <IconChevronDown size={20} />
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
            fontSize: "19.2px",
            maxWidth: 180,
          }}
        />
        <Group ml={"auto"}>
          <Group gap={"5"}>
            {flowEditable && (
              <Tooltip label="Delete Screen">
                <ActionIcon onClick={toggle} variant="subtle" color="gray">
                  <IconTrash size={20} />
                </ActionIcon>
              </Tooltip>
            )}
            <ActionIcon variant="subtle" onClick={setExpanded}>
              {expanded ? (
                <IconChevronUp size={20} />
              ) : (
                <IconChevronDown size={20} />
              )}
            </ActionIcon>
          </Group>
        </Group>
      </Group>
      <Collapse in={expanded}>
        <Droppable droppableId={screen.id} direction="vertical">
          {(provided) => (
            <Stack
              py="xs"
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
              <Group w={"100%"} mt={"md"}>
                <Box>
                  <Text fz={"xs"}>Next button text</Text>
                  <EditableText
                    text={footerLabel}
                    setText={setFooterLabel}
                    setEditingItem={setEditingItemFooter}
                    id={screen.title}
                    editMode={
                      flowEditable && editingItemForFooter === screen.title
                    }
                    placeholder="Next button text"
                    handleOnFunction={false}
                    handleButtonTextUpdate={handleButtonTextUpdate}
                    size="md"
                    style={{
                      flex: 1,
                    }}
                  />
                </Box>
                <RateupButtonBlue
                  onClick={handleAddElementClick}
                  title={"Add"}
                  leftIcon={<IconPlus />}
                  size="md"
                  radius={"sm"}
                  mt="md"
                />
              </Group>
            </Stack>
          )}
        </Droppable>
      </Collapse>
    </Paper>
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
      <Badge style={{ minWidth: "1.875rem" }} c={"white"} variant={"filled"}>
        {index + 1}
      </Badge>
      <Text px="xs" fw={500} truncate style={{ flex: 1 }}>
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
