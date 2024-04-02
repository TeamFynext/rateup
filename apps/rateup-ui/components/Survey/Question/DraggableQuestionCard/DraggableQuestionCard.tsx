import {
  Badge,
  ActionIcon,
  Text,
  Flex,
  Box,
  useMantineTheme,
  Group,
  Image,
} from "@mantine/core";
import { useDisclosure, useHover } from "@mantine/hooks";
import {
  IconBrandGoogle,
  IconGripVertical,
  IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import { questionIcons } from "../QuestionTypeSelection";
import React, { useContext } from "react";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { Draggable } from "react-beautiful-dnd";
import classes from "./DraggableQuestionCard.module.css";
import cx from "clsx";
import { useQuestionDeleteMutation } from "../../../../backend/surveys/questions/questions.query";
import ConfirmationModal from "../../../Modal/ConfirmationModal";
import { QuestionType } from "../../../../types/enums";

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
  const extractText = (htmlContent) => {
    // Regular expression to remove htmlContent tags
    const regex = /(<([^>]+)>)/gi;
    // Extract text from htmlContent by replacing htmlContent tags with an empty string
    return htmlContent?.replace(regex, "");
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
              style={{
                backgroundColor: selected ? "var(--light-grey-color)" : "white",
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
                  />
                )}
                {question.googleReview && (
                  <IconBrandGoogle
                    color={
                      isWaSurvey == true
                        ? theme.colors["whatsapp-green"][6]
                        : "var(--tertiary-color)"
                    }
                    stroke={4}
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
