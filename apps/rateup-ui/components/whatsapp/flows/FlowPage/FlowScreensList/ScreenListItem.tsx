import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconGripVertical,
  IconTrash,
} from "@tabler/icons-react";
import { useContext, useState } from "react";
import {
  getScreenObjById,
  updateFlowJsonNavigationAndDataPassing,
} from "../../../../../utils/whatsapp/flow.utils";
import { EditableText } from "../../../../input/EditableText";
import { WaFlowFormElement, WaFlowScreen } from "../../../../../types/global";
import { EditFlowContext } from "../EditFlow/EditFlowContext";
import dndClasses from "../../../../Survey/Question/DraggableQuestionCard/DraggableQuestionCard.module.css";
import {
  getFlowElementText,
  getFlowFormElementsFromScreen,
  getQuestionsFromScreen,
} from "../../../../../utils/whatsapp/flow.utils";
import { useUpdateSurveyMutation } from "../../../../../backend/surveys/surveys.query";
import { useReplaceQuestionsMutation } from "../../../../../backend/surveys/questions/questions.query";
import { WaFlowFormElementType } from "../../../../../types/enums";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { useRouter } from "next/router";
import { useWaFlowFromDb } from "../../../../../backend/whatsapp/flow/flow.query";
import { FlowMaxElementsPerScreen } from "../../../whatsappConfig";
import { showErrorToast } from "../../../../../utils/notifications";
import { modals } from "@mantine/modals";

interface ScreenListItemProps {
  screen: WaFlowScreen;
  onAddElementClick: (screenId: string) => void;
  onElementClick: (feId: string, screenId: string) => void;
  onDeleteElement: (feId: string, screenId: string) => void;
}
function ScreenListItem({
  screen,
  onAddElementClick,
  onElementClick,
  onDeleteElement,
}: ScreenListItemProps) {
  const [expanded, setExpanded] = useState(true); // expanded screen id
  const [editingItem, setEditingItem] = useState(null); // editing screen id (titleEdit)
  const updateSurveyMutation = useUpdateSurveyMutation();

  const {
    survey,
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

  const elements = getFlowFormElementsFromScreen(screen);

  const openDeleteModal = () => {
    modals.openConfirmModal({
      title: "Delete Screen",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this Screen? It will also delete all
          the elements in this screen.
        </Text>
      ),
      labels: { confirm: "Yes", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: handleDeleteScreen,
      onCancel: () => modals.closeAll(),
    });
  };

  const handleDeleteScreen = () => {
    setSelectedFormElementId(null);
    updateFlowJson((draft) => {
      const questions = getQuestionsFromScreen(screen, survey, map);
      const qIds = questions.map((q) => q.id);
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
    updateFlowJson((draft) => {
      const screenToBeEdited = getScreenObjById(draft.screens, screen.id);
      screenToBeEdited["title"] = title;
    });
  }

  function handleAddElementClick() {
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
    const element = elements[index];
    onDeleteElement(element.id, screen.id);
  }

  function handleElementClick(index: number) {
    const element = elements[index];
    onElementClick(element.id, screen.id);
  }

  return (
    <Paper
      p="xs"
      shadow="lg"
      key={screen.id}
      style={{
        border: ".1px solid rgba(0,0,0,.1)",
        borderRadius: "8px",
      }}
    >
      <Group justify="space-between">
        <EditableText
          text={screen.title}
          setText={updateScreenTitle}
          id={screen.title}
          editMode={editingItem === screen.title}
          setEditingItem={setEditingItem}
          placeholder="Section title (Required if more than one section is added)"
          style={{
            flexGrow: 1,
          }}
          textStyle={{
            fontWeight: "bold",
            fontSize: "1.2rem",
          }}
        />
        <Group>
          <Tooltip label="Delete Screen">
            <ActionIcon onClick={openDeleteModal} variant="subtle" color="gray">
              <IconTrash />
            </ActionIcon>
          </Tooltip>
          <ActionIcon
            variant="subtle"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? <IconChevronUp /> : <IconChevronDown />}
          </ActionIcon>
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
              <Button onClick={handleAddElementClick} variant="outline" mt="sm">
                Add Element
              </Button>
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
  props: Omit<FormElementCardProps, "dragHandleProps">,
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
}: FormElementCardProps) {
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
      <Badge
        style={{ minWidth: "30px" }}
        c={"white"}
        variant={selected ? "filled" : "filled"}
      >
        {index + 1}
      </Badge>
      <Text px="xs" fw={500} truncate style={{ flex: 1 }}>
        {text}
      </Text>
      <ActionIcon
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleDelete(index);
        }}
        variant="subtle"
        color="gray"
      >
        <IconTrash />
      </ActionIcon>
    </Box>
  );
}

export default ScreenListItem;
