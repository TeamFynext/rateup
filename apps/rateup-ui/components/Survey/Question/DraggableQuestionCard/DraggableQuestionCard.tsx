import {
  ActionIcon,
  Badge,
  Box,
  Flex,
  Group,
  Image,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure, useHover } from "@mantine/hooks";
import { IconGripVertical, IconTrash } from "@tabler/icons-react";
import cx from "clsx";
import { useRouter } from "next/router";
import React, { useContext } from "react";
import { Draggable } from "react-beautiful-dnd";
import { useQuestionDeleteMutation } from "../../../../backend/surveys/questions/questions.query";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { extractText } from "../../../../utils";
import { GoogleIcon } from "../../../Button/GoogleIcon";
import ConfirmationModal from "../../../Modal/ConfirmationModal";
import { questionIcons } from "../QuestionTypeSelection";
import classes from "./DraggableQuestionCard.module.css";

interface DraggableQuestionCardProps {
  question: Question;
  index: number;
  handleOpenQuestion: (Q: Question) => void;
  selected: boolean;
  onDelete: (questionId: string) => void;
  isWaSurvey?: boolean;
}

export function DraggableQuestionCard({
  question,
  index,
  selected,
  handleOpenQuestion,
  onDelete,
  isWaSurvey,
}: DraggableQuestionCardProps) {
  // TODO: ref lost when card is dragged to new place
  const { hovered, ref: hoverRef } = useHover();
  const router = useRouter();
  const { surveyId } = router.query as { surveyId: string };
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const theme = useMantineTheme();

  const questionDeleteMutation = useQuestionDeleteMutation(surveyId, (qId) => {
    onDelete(qId);
  });

  const handleDelete = (e, qId) => {
    e?.stopPropagation();
    questionDeleteMutation.mutate(qId);
  };
  return (
    <>
      <ConfirmationModal
        forDeleteFunctionality
        confirmLabel="Delete"
        headerLabel="Are you sure to delete this question?"
        headerTitle="Delete question?"
        opened={dialogOpened}
        onClose={closeDialog}
        onConfirm={(e) => {
          handleDelete(e, question.id);
        }}
      />
      <Draggable key={question.id} index={index} draggableId={question.id}>
        {(provided, snapshot) => (
          <div ref={hoverRef}>
            <Box
              className={cx(
                classes.item,
                {
                  [classes.itemDragging]: snapshot.isDragging,
                },
                classes.transition,
              )}
              ref={provided.innerRef}
              onClick={() => handleOpenQuestion(question)}
              {...provided.draggableProps}
              data-select={selected}
              style={{
                ...provided.draggableProps.style,
              }}
            >
              <div {...provided.dragHandleProps} className={classes.dragHandle}>
                <IconGripVertical size={20} stroke={1.5} />
              </div>
              <Badge
                style={{ minWidth: "30px" }}
                c={"white"}
                variant={selected ? "filled" : "filled"}
              >
                <Flex style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}>
                  {questionIcons[question.type] &&
                    React.createElement(questionIcons[question.type], {
                      size: 15,
                      strokeWidth: 2,
                      style: { marginRight: "0.5rem" },
                    })}
                  {index + 1}
                </Flex>
              </Badge>
              <Text px="xs" fw={500} truncate style={{ flex: 1 }}>
                {extractText(
                  question.title[selectedLanguage] ||
                    question.description[selectedLanguage],
                )}
              </Text>

              <Group justify={"flex-end"} gap={4} ml={"auto"} miw={70}>
                {question?.logic?.length && (
                  <Image
                    src={
                      isWaSurvey == true
                        ? `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump-whatsapp.svg`
                        : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump.svg`
                    }
                    w={30}
                    h={30}
                    fit="contain"
                    alt="image of logic jump"
                  />
                )}
                {question.googleReview && (
                  <GoogleIcon
                    color={
                      isWaSurvey == true
                        ? theme.colors["whatsapp-green"][6]
                        : "var(--tertiary-color)"
                    }
                    style={{ width: "2rem", height: "1rem" }}
                  />
                )}
                <ActionIcon
                  onClick={() => {
                    closeDialog();
                    toggle();
                  }}
                  variant="subtle"
                  color="gray"
                >
                  <IconTrash />
                </ActionIcon>
              </Group>
            </Box>
          </div>
        )}
      </Draggable>
    </>
  );
}
