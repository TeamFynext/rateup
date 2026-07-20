import { Draggable } from "@hello-pangea/dnd";
import { IconGripVertical, IconTrash } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import cx from "clsx";
import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";

import { useQuestionDeleteMutation } from "@/backend/surveys/questions/questions.query";
import { useConfirm } from "@/context/confirm-provider.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { PageType, QuestionType } from "@/types/enums.ts";
import { extractText } from "@/utils/index.ts";

import { pageIcons } from "../../Page/PageIcons.ts";
import { getReplacedTitleFromVariable } from "../../TakeSurvey/TakeSurveyComponent/util.tsx";
import { reviewPageLogosObj } from "../QuestionReviewPageEditor/constants.tsx";
import { questionIcons } from "../QuestionTypeSelection.tsx";

const questionTypeColors: Record<string, string> = {
  // Page types
  [PageType.Welcome]: "#3B82F6",
  [PageType.ThankYou]: "#3B82F6",
  [PageType.Language]: "#6366F1",
  [PageType.Custom]: "#14B8A6",
  [PageType.GoogleReview]: "#EF4444",
  // Question types
  [QuestionType.Text]: "#8B5CF6",
  [QuestionType.TextArea]: "#EC4899",
  [QuestionType.Number]: "#F59E0B",
  [QuestionType.Email]: "#3B82F6",
  [QuestionType.Phone]: "#10B981",
  [QuestionType.Photo]: "#6366F1",
  [QuestionType.Date]: "#06B6D4",
  [QuestionType.LD]: "#14B8A6",
  [QuestionType.YN]: "#10B981",
  [QuestionType.Rating]: "#22C55E",
  [QuestionType.Smiley]: "#EAB308",
  [QuestionType.Opinion]: "#F97316",
  [QuestionType.MCQ]: "#6366F1",
  [QuestionType.MSQ]: "#8B5CF6",
  [QuestionType.CustomNPS]: "#F97316",
  [QuestionType.PCQ]: "#A855F7",
  [QuestionType.Testimonial]: "#10B981",
  [QuestionType.EmailPhone]: "#3B82F6",
  [QuestionType.DDSS]: "#64748B",
  [QuestionType.DDMS]: "#64748B",
  [QuestionType.Contact]: "#14B8A6",
  [QuestionType.TnC]: "#EF4444",
  [QuestionType.InfoMessage]: "#0EA5E9",
  [QuestionType.MultiTextInput]: "#7C3AED",
  [QuestionType.MCQGrid]: "#6366F1",
  [QuestionType.File]: "#78716C",
  [QuestionType.EmailOtp]: "#EF4444",
  [QuestionType.WOP]: "#F97316",
  [QuestionType.WaList]: "#22C55E",
  [QuestionType.WaButtons]: "#3B82F6",
  [QuestionType.WaTimeSlot]: "#06B6D4",
  [QuestionType.PhotoPicker]: "#6366F1",
  [QuestionType.DocumentPicker]: "#78716C",
};

import { Button } from "@/components/ui/button.tsx";

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
  const [hovered, setHovered] = useState(false);
  const params = useParams({
    strict: false,
  });
  const surveyId = params.surveyId as string;
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const confirm = useConfirm();

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

  const handleDelete = async (e) => {
    e?.stopPropagation();
    const shouldDelete = await confirm({
      title: ` ${translations("Delete")} ${question.type in PageType ? translations("page") : translations("question")}?`,
      description: ` ${translations("Are you sure to delete this")} ${question.type in PageType ? translations("page") : translations("question")}?`,
      confirmText: translations("Delete"),
    });

    if (!shouldDelete) return;

    questionDeleteMutation.mutate(question.id);
  };

  const nonDeletablePagetypeStrs = ["Language", "GoogleReview"];
  const nonClickableQuestionTypeStrs = ["GoogleReview"];
  const { t: translations } = useTranslation();
  return (
    <>
      <Draggable
        key={question.id}
        index={index}
        draggableId={question.id}
        // isDragDisabled={question.type in PageType}
      >
        {(provided, snapshot) => (
          <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            <div
              className={cx(
                "relative flex cursor-pointer items-center gap-[9px] border-l-[3px] border-l-transparent bg-card px-3 py-[11px] transition-all duration-[120ms] not-data-[select=true]:hover:bg-muted data-[select=true]:border-l-primary data-[select=true]:bg-accent",
                {
                  "rounded-lg shadow-custom-hover": snapshot.isDragging,
                },
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
              <div
                {...provided.dragHandleProps}
                className="flex shrink-0 items-center justify-center text-muted-foreground"
              >
                <IconGripVertical size={14} stroke={1.5} />
              </div>
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-white"
                style={{ backgroundColor: questionTypeColors[question.type] ?? "var(--primary)" }}
              >
                {(pageIcons[question.type] || questionIcons[question.type]) &&
                  React.createElement(pageIcons[question.type] ?? questionIcons[question.type], {
                    size: 18,
                    strokeWidth: 2,
                  })}
              </div>
              <span className="flex-1 truncate px-2 text-[13px] text-foreground">
                {extractText(questionTitle)}
              </span>

              <div className="flex items-center justify-end gap-1 ml-auto">
                {question?.logic?.length && (
                  <img
                    src={
                      isWaSurvey == true
                        ? `${import.meta.env.VITE_FRONTEND_URL}/images/logic-jump-whatsapp.svg`
                        : `${import.meta.env.VITE_FRONTEND_URL}/images/logic-jump.svg`
                    }
                    width={30}
                    height={30}
                    className="object-contain"
                    alt="logic jump"
                  />
                )}
                {question.reviewPageOptions && reviewPageLogosObj[question.reviewPagePlatform]}

                {!nonDeletablePagetypeStrs.includes(question.type) && hovered && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      handleDelete(e);
                    }}
                  >
                    <IconTrash className="size-4" />
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
