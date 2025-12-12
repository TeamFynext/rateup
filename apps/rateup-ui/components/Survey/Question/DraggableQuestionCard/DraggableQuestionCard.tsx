"use client";

import React, { useContext } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

import { useDisclosure, useHover } from "@mantine/hooks";
import { IconGripVertical, IconTrash } from "@tabler/icons-react";
import { Draggable } from "@hello-pangea/dnd";
import { useTranslations } from "next-intl";

import { PageType } from "@/types/enums";
import { useQuestionDeleteMutation } from "@/backend/surveys/questions/questions.query";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";
import { Button } from "@/components/ui/button";
import SelectedLanguageContext from "@/context/SelectedLanguage";
import { extractText } from "@/utils";

import { pageIcons } from "../../Page/PageIcons";
import { getReplacedTitleFromVariable } from "../../TakeSurvey/TakeSurveyComponent/util";
import { reviewPageLogosObj } from "../QuestionReviewPageEditor/constants";
import { questionIcons } from "../QuestionTypeSelection";

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
  const params = useParams();
  const surveyId = params.surveyId as string;
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const questionTitle =
    getReplacedTitleFromVariable({
      title:
        question.title[selectedLanguage] ||
        question.description[selectedLanguage],
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
  const translations = useTranslations();
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
        //isDragDisabled={question.type in PageType}
      >
        {(provided, snapshot) => (
          <div ref={hoverRef} className="flex flex-col">
            <div
              className={`${selected && "bg-primary"} flex flex-col sm:flex-row items-center justify-between gap-3 rounded-sm border p-4 cursor-pointer relative mb-2 transition-all duration-300 shadow-sm w-[20vw] sm:w-[50vh] lg:w-full`}
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-center gap-2">
                <div
                  {...provided.dragHandleProps}
                  className={`${selected && "text-white"} flex items-center justify-center content-center h-full`}
                >
                  <IconGripVertical size={20} stroke={1.5} />
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-center gap-3">
                  <div className="relative">
                    <div
                      className={`p-1.5 flex items-center justify-center rounded-sm ${selected ? "bg-white/30 text-white" : "text-primary"}`}
                    >
                      {pageIcons[question.type] &&
                        React.createElement(pageIcons[question.type], {
                          size: 25,
                          strokeWidth: 2,
                        })}

                      {questionIcons[question.type] &&
                        React.createElement(questionIcons[question.type], {
                          size: 25,
                          strokeWidth: 2,
                        })}
                    </div>
                    <p
                      className={`absolute -top-2 -right-2 z-10 text-xs w-5 h-5 p-1 flex items-center justify-center rounded-sm ${selected ? "bg-white text-primary" : "bg-primary text-white"}`}
                    >
                      {index + 1}
                    </p>
                  </div>
                  <p className={`${selected && "text-white"} flex-1`}>
                    {extractText(questionTitle)}
                  </p>
                </div>
              </div>

              <div className="flex gap-1">
                {question?.logic?.length && (
                  <Image
                    src={
                      isWaSurvey == true
                        ? `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump-whatsapp.svg`
                        : `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logic-jump.svg`
                    }
                    width={30}
                    height={30}
                    alt="image of logic jump"
                    style={{
                      filter: selected ? "brightness(0) invert(1)" : "none",
                    }}
                  />
                )}
                {question.reviewPageOptions &&
                  reviewPageLogosObj[question.reviewPagePlatform]}

                {!nonDeletablePagetypeStrs.includes(question.type) && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDialog();
                      toggle();
                    }}
                    variant="ghost"
                  >
                    <IconTrash className={`${selected && "text-white"}`} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Draggable>
    </>
  );
}
