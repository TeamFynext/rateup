import { getQuestions, getSurvey } from "../../../api"
import { Badge, Grid, Group, Paper, Select, Stack, Title } from "@mantine/core"
import { createStyles, rem, Text } from '@mantine/core';
import { useListState } from '@mantine/hooks';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { IconGripVertical } from '@tabler/icons-react';
import { useState } from "react";


export default ({survey, questions}) => {
  const [selectedLanguage, setSelectedLanguage] = useState(survey.languages[0])
  return (
  <Stack>
    <Group position="apart" >
    <Title>{survey.title}</Title>
    <Select
      data={survey.languages}
      value={selectedLanguage}
      onChange={setSelectedLanguage}
      />
    </Group>
    <Group >
        <Paper p={"sm"} sx={{flex: 2}}>
          <Stack>
            <DraggableQuestionsContainer questions={questions} selectedLanguage={selectedLanguage}/>
          </Stack>
        </Paper>
        <Paper p={"sm"} sx={{flex: 5}}>
            <Title>world</Title>
        </Paper>
    </Group>
  </Stack>
  );

}
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


export function DraggableQuestionsContainer({ questions, selectedLanguage }) {
  const { classes, cx } = useStyles();
  const [state, handlers] = useListState(questions);

  const items = state.map((question, index) => (
    <Draggable key={question.id} index={index} draggableId={question.id}>
      {(provided, snapshot) => (
        <div
          className={cx(classes.item, { [classes.itemDragging]: snapshot.isDragging })}
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          <div {...provided.dragHandleProps} className={classes.dragHandle}>
            <IconGripVertical size="1.05rem" stroke={1.5} />
          </div>
          <Badge>{question.order}</Badge>
            <Text pl="xs">{question.title[selectedLanguage]}</Text>
        </div>
      )}
    </Draggable>
  ));

  return (
    <DragDropContext
      onDragEnd={({ destination, source }) =>
        handlers.reorder({ from: source.index, to: destination?.index || 0 })
      }
    >
      <Droppable droppableId="dnd-list" direction="vertical">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {items}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}


export async function getServerSideProps({params}) {
  try {
    const survey = await (await getSurvey(params.surveyId)).json()
    const questions = await (await getQuestions(params.surveyId)).json();
    return {
      props: {
        survey,
        questions
      }
    }
  } catch (error) {
    console.error(error)
    return;
  }
}