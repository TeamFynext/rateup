import { Badge, ActionIcon, createStyles, rem, Text } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconGripVertical, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useContext } from "react";
import { deleteQuestion } from "../../../api";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import {Draggable } from 'react-beautiful-dnd';

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

export function DraggableQuestionCard({question, index, handleOpenQuestion}) {
  const { classes, cx } = useStyles();
  // TODO: ref lost when card is dragged to new place
  const {hovered, ref: hoverRef} = useHover();
  const router = useRouter()
  const {selectedLanguage} = useContext(SelectedLanguageContext)

  const handleDelete = (e, qId) => {
    e.stopPropagation();
    deleteQuestion(qId)
      .then(() => {
        notifications.show({message: "Deleted"})
      })
      .catch(e => {
        console.error(e);
        notifications.show({message: "Deleted"});
      })
      router.replace(router.asPath);
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
          <Badge>{question.order}</Badge>
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
