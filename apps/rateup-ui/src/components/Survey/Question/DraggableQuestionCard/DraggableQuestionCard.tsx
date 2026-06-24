import { Draggable } from "@hello-pangea/dnd";
import { ActionIcon, Badge, Box, Flex, Group, Image, Text } from "@mantine/core";
import { useDisclosure, useHover } from "@mantine/hooks";
import { IconGripVertical, IconTrash } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import cx from "clsx";
import React, { useContext } from "react";
import { useTranslation } from "react-i18next";

import { useQuestionDeleteMutation } from "@/backend/surveys/questions/questions.query";
import ConfirmationModal from "@/components/Modal/ConfirmationModal.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { PageType } from "@/types/enums.ts";
import { extractText } from "@/utils/index.ts";

import { pageIcons } from "../../Page/PageIcons.ts";
import { getReplacedTitleFromVariable } from "../../TakeSurvey/TakeSurveyComponent/util.tsx";
import { reviewPageLogosObj } from "../QuestionReviewPageEditor/constants.tsx";
import { questionIcons } from "../QuestionTypeSelection.tsx";

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
  const { ref: hoverRef } = useHover();
  const params = useParams({
    strict: false,
  });
  const surveyId = params.surveyId as string;
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);

  const questionTitle =
    getReplacedTitleFromVariable({
      title: question.title[selectedLanguage] || question.description[selectedLanguage],
      surveyId,
    }) ||
    question.title[selectedLanguage] ||
    question.description[selectedLanguage];

  const questionDeleteMutation = useQuestionDeleteMutation(surveyId, (qId) => {
    onDelete(qId);
  });

  const handleDelete = (e, qId) => {
    e?.stopPropagation();
    questionDeleteMutation.mutate(qId);
  };

  const nonDeletablePagetypeStrs = ["Language", "GoogleReview"];
  const nonClickableQuestionTypeStrs = ["GoogleReview"];
  const { t: translations } = useTranslation();
  return (
    <>
      <ConfirmationModal
        forDeleteFunctionality
        confirmLabel={translations("Delete")}
        headerLabel={` ${translations("Are you sure to delete this")} ${question.type in PageType ? translations("page") : translations("question")}?`}
        headerTitle={` ${translations("Delete")} ${question.type in PageType ? translations("page") : translations("question")}?`}
        opened={dialogOpened}
        onClose={closeDialog}
        onConfirm={(e) => {
          handleDelete(e, question.id);
        }}
      />
      <Draggable
        key={question.id}
        index={index}
        draggableId={question.id}
        // isDragDisabled={question.type in PageType}
      >
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
              onClick={() => {
                if (!nonClickableQuestionTypeStrs.includes(question.type)) {
                  handleOpenQuestion(question);
                }
              }}
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
                  {pageIcons[question.type] &&
                    React.createElement(pageIcons[question.type], {
                      size: 15,
                      strokeWidth: 2,
                      style: { marginRight: "0.5rem" },
                    })}

                  {questionIcons[question.type] &&
                    React.createElement(questionIcons[question.type], {
                      size: 15,
                      strokeWidth: 2,
                      style: { marginRight: "0.5rem" },
                    })}
                  {index + 1}
                </Flex>
              </Badge>
              <Text px="xs" fz={14} truncate style={{ flex: 1 }}>
                {extractText(questionTitle)}
              </Text>

              <Group justify={"flex-end"} gap={4} ml={"auto"}>
                {question?.logic?.length && (
                  <Image
                    src={
                      isWaSurvey == true
                        ? `${import.meta.env.VITE_FRONTEND_URL}/images/logic-jump-whatsapp.svg`
                        : `${import.meta.env.VITE_FRONTEND_URL}/images/logic-jump.svg`
                    }
                    w={30}
                    h={30}
                    fit="contain"
                    alt="image of logic jump"
                  />
                )}
                {question.reviewPageOptions && reviewPageLogosObj[question.reviewPagePlatform]}

                {!nonDeletablePagetypeStrs.includes(question.type) && (
                  <ActionIcon
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDialog();
                      toggle();
                    }}
                    variant="subtle"
                    color="gray"
                  >
                    <IconTrash />
                  </ActionIcon>
                )}
              </Group>
            </Box>
          </div>
        )}
      </Draggable>
    </>
  );
}
