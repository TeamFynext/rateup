import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconEdit,
  IconGripVertical,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  getFormObjFromScreenId,
  getScreenObjById,
  getWaFlowElementIdFromQuestionId,
  updateFlowJsonNavigationAndDataPassing,
} from "../../../../../utils/whatsapp/flow.utils";
import { EditableText } from "../../../../input/EditableText";
import {
  WaFlowFormElement,
  WaFlowJson,
  WaFlowScreen,
} from "../../../../../types/global";
import { EditFlowContext } from "../EditFlow/EditFlowContext";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import dndClasses from "../../../../Survey/Question/DraggableQuestionCard/DraggableQuestionCard.module.css";
import {
  getFlowElementText,
  getFlowFormElementsFromScreen,
  getQuestionsFromScreen,
} from "../../../../../utils/whatsapp/flow.utils";
import { useUpdateSurveyMutation } from "../../../../../backend/surveys/surveys.query";
import {
  useQuestionDeleteMutation,
  useReplaceQuestionsMutation,
} from "../../../../../backend/surveys/questions/questions.query";
import {
  QuestionType,
  WaFlowFormElementType,
} from "../../../../../types/enums";
import { Droppable, Draggable } from "@hello-pangea/dnd";

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
    selectedLang,
    selectedFormElementId,
    setSelectedFormElementId,
    updateSurvey,
    flowJson,
    selectedScreenId,
  } = useContext(EditFlowContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const replaceQuestionsMutation = useReplaceQuestionsMutation(survey.id);

  const elements = getFlowFormElementsFromScreen(screen);

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
      updateFlowJsonNavigationAndDataPassing(draft);
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
  const questions = getQuestionsFromScreen(screen, survey as Survey, map);

  function updateScreenTitle(title: string) {
    updateFlowJson((draft) => {
      const screenToBeEdited = getScreenObjById(draft.screens, screen.id);
      screenToBeEdited["title"] = title;
    });
  }

  function handleAddElementClick() {
    onAddElementClick(screen.id);
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
            <ActionIcon
              onClick={handleDeleteScreen}
              variant="subtle"
              color="gray"
            >
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
