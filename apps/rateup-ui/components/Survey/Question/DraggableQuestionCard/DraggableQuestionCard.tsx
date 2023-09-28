import { Badge, ActionIcon, Text, Box, useMantineTheme, Dialog,Group  } from "@mantine/core";
import { useDisclosure, useHover } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconGripVertical, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useContext, useState } from "react";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { Draggable } from "react-beautiful-dnd";
import { deleteQuestion } from "../../../../backend/surveys/questions/questions.api";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import classes from "./DraggableQuestionCard.module.css";
import { RateupButtonPrimary, RateupButtonSecondary } from "../../../Button/RateupButtons";
import cx from 'clsx';

interface DraggableQuestionCardProps {
  question: Question;
  index: number;
  handleOpenQuestion: (Q: Question) => void;
  selected: boolean;
}

export function DraggableQuestionCard({
  question,
  index,
  selected,
  handleOpenQuestion,
}: DraggableQuestionCardProps) {
  
  // TODO: ref lost when card is dragged to new place
  const { hovered, ref: hoverRef } = useHover();
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const queryClient = useQueryClient();
  const theme = useMantineTheme();
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const [isLoading, setIsLoading] = useState(false);


  const questionDeleteMutation = useMutation({
    mutationFn: (qId: string) => deleteQuestion(surveyId, qId),
    onSuccess: () => {
      queryClient.invalidateQueries(["questions", surveyId]);
      notifications.show({ message: "Deleted" });
    },
  });

  const handleDelete = (e, qId) => {
    e.stopPropagation();
    questionDeleteMutation.mutate(qId);
  };

  return (<>
   <Dialog opened={dialogOpened} withCloseButton onClose={closeDialog} size="lg" radius="md"  position={{top: '0', left:'40vw'}}>
          <Text size="md" mb="xs" fw={500}>
              Are you sure to delete this question?
          </Text>

          <Group align="center" pt="lg">
          <RateupButtonSecondary onClick={closeDialog} loading={isLoading} size='md' title="Cancel" />

          <RateupButtonPrimary 
          
            onClick={(e) => {
                e.stopPropagation();
                handleDelete(e, question.id)
            }} 
            
            loading={isLoading} size='md' title="Yes, Delete" />

          </Group>
      </Dialog>

    <Draggable key={question.id} index={index} draggableId={question.id}>
      {(provided, snapshot) => (
        <div ref={hoverRef}>
          <Box
            className={cx(classes.item, {
              [classes.itemDragging]: snapshot.isDragging,
            })}
            ref={provided.innerRef}
            {...provided.draggableProps}
            onClick={() => handleOpenQuestion(question)}
            sx={{
              backgroundColor: selected ? theme.colors.blue[0] : "white",
            }}
          >
            <div {...provided.dragHandleProps} className={classes.dragHandle}>
              <IconGripVertical size={20} stroke={1.5} />
            </div>
            <Badge  style={{ minWidth: '30px'}} bg={selected ? theme.colors.blue[9] : "yellow"} c={selected ? "white" : "black"} variant={selected ? "filled" : "light"}>
              {index + 1}</Badge>
            {/* TODO: add truncate and make height fixed*/}
            <Text pl="xs" fw={500} px="md">{question.title[selectedLanguage]}</Text>
            {true ? (
              <ActionIcon
                onClick={() => {
                  closeDialog()
                  toggle()
                }}
                variant="subtle" color="gray"
                style={{ position: "absolute", right: "5px" }}
              >
                <IconTrash />
              </ActionIcon>
            ) : null}
          </Box>
        </div>
      )}
    </Draggable>
    </>
  );
}
