import {
  Badge,
  ActionIcon,
  Text,
  Box,
  useMantineTheme,
  Dialog,
  Group,
} from "@mantine/core";
import { useDisclosure, useHover } from "@mantine/hooks";
import { IconGripVertical, IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useContext, useState } from "react";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { Draggable } from "react-beautiful-dnd";
import { useQueryClient } from "@tanstack/react-query";
import classes from "./DraggableQuestionCard.module.css";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../Button/RateupButtons";
import cx from "clsx";
import { useQuestionDeleteMutation } from "../../../../backend/surveys/questions/questions.query";

interface DraggableQuestionCardProps {
  question: Question;
  index: number;
  handleOpenQuestion: (Q: Question) => void;
  selected: boolean;
  onDelete: (questionId: string) => void;
}

export function DraggableQuestionCard({
  question,
  index,
  selected,
  handleOpenQuestion,
  onDelete,
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

  const questionDeleteMutation = useQuestionDeleteMutation(surveyId, (qId) => {
    if (qId === question.id) {
      onDelete(qId);
    }
  });

  const handleDelete = (e, qId) => {
    e.stopPropagation();
    questionDeleteMutation.mutate(qId);
  };

  return (
    <>
      <Dialog
        opened={dialogOpened}
        withCloseButton
        onClose={closeDialog}
        size="lg"
        radius="md"
        position={{ top: "0", left: "40vw" }}
      >
        <Text size="md" mb="xs" fw={500}>
          Are you sure to delete this question?
        </Text>

        <Group align="center" pt="lg">
          <RateupButtonSecondary
            onClick={closeDialog}
            loading={isLoading}
            size="md"
            title="Cancel"
          />

          <RateupButtonBlue
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(e, question.id);
            }}
            loading={isLoading}
            size="md"
            title="Yes, Delete"
          />
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
              style={{
                backgroundColor: selected ? "var(--light-grey-color)" : "white",
              }}
            >
              <div {...provided.dragHandleProps} className={classes.dragHandle}>
                <IconGripVertical size={20} stroke={1.5} />
              </div>
              <Badge
                style={{ minWidth: "30px" }}
                bg={"var(--tertiary-color)"}
                c={"white"}
                variant={selected ? "filled" : "filled"}
              >
                {index + 1}
              </Badge>
              {/* TODO: add truncate and make height fixed*/}
              <Text pl="xs" fw={500} px="md">
                {question.title[selectedLanguage] ||
                  question.description[selectedLanguage]}
              </Text>
              {true ? (
                <ActionIcon
                  onClick={() => {
                    closeDialog();
                    toggle();
                  }}
                  variant="subtle"
                  color="gray"
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
