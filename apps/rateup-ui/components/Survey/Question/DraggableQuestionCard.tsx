import { Badge, ActionIcon, createStyles, rem, Text } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconGripVertical, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useContext } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import {Draggable } from 'react-beautiful-dnd';
import { deleteQuestion } from "../../../api/surveys/questions/questions.api";
import { useQueryClient, useMutation } from "@tanstack/react-query";

const useStyles = createStyles((theme) => ({
  item: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: theme.radius.md,
    border: `${rem(1)} solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]
    }`,
    padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
    paddingLeft: `calc(${theme.spacing.xl} - ${theme.spacing.md})`, // to offset drag handle
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.white,
    marginBottom: theme.spacing.sm,
    paddingRight: "30px",
    cursor: "pointer",
    position: "relative"
  },

  itemDragging: {
    boxShadow: theme.shadows.sm,
  },

  dragHandle: {
    ...theme.fn.focusStyles(),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: theme.colorScheme === 'dark' ? theme.colors.dark[1] : theme.colors.gray[6],
  },
}));

interface DraggableQuestionCardProps {
  question: Question;
  index: number;
  handleOpenQuestion: (qId: string) => void;
}

export function DraggableQuestionCard({question, index, handleOpenQuestion}: DraggableQuestionCardProps) {
  const { classes, cx } = useStyles();
  // TODO: ref lost when card is dragged to new place
  const {hovered, ref: hoverRef} = useHover();
  const router = useRouter()
  const {surveyId }  = router.query as {surveyId: string}
  const {selectedLanguage} = useContext(SelectedLanguageContext)
  const queryClient = useQueryClient();


  const questionDeleteMutation = useMutation({
    mutationFn: (qId: string) => deleteQuestion(surveyId, qId),
    onSuccess: () => {
      queryClient.invalidateQueries(['questions', surveyId])
      notifications.show({message: "Deleted"})
    }
  })


  const handleDelete = (e, qId) => {
    e.stopPropagation();
    questionDeleteMutation.mutate(qId)
  }

  return <Draggable key={question.id} index={index} draggableId={question.id}>
    {(provided, snapshot) => (
      <div ref={hoverRef}>
        <div
          className={cx(classes.item, { [classes.itemDragging]: snapshot.isDragging })}
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={() => handleOpenQuestion(question.id)}
        >
          <div {...provided.dragHandleProps} className={classes.dragHandle}>
            <IconGripVertical size={20} stroke={1.5} />
          </div>
          <Badge>{index + 1}</Badge>
          {/* TODO: add truncate */}
          <Text pl="xs">{question.title[selectedLanguage]}</Text>
          {true ? (
            <ActionIcon onClick={(e) => handleDelete(e, question.id)} sx={{ position: "absolute", right: "5px" }}>
              <IconTrash />
            </ActionIcon>
          ) : null}
        </div>
      </div>
    )}
  </Draggable>;
}
