import type { DropResult } from "@hello-pangea/dnd";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { IconEdit, IconGripVertical, IconPlus, IconTrash } from "@tabler/icons-react";
import { useContext, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Field, FieldError } from "@/components/ui/field.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { cn } from "@/lib/utils";
import { SurveyType } from "@/types/enums.ts";
import { reorder } from "@/utils/questions.ts";

import { ChoicesCreator } from "./ChoicesCreator.tsx";
import type { QuestionExtraPropsForm } from "./questionForm.ts";

/**
 * NOTE: this component reads `form.values` and calls `form.setFieldValue` —
 * the Mantine form API. The form it is handed (from QuestionDetailedView) is a
 * react-hook-form instance, which has neither, so `values` reads as undefined
 * today. Typed to match what the component actually touches rather than
 * changing its behaviour; see the migration notes.
 */
const MCQGridExtraProps = ({ form, qId }: { form: QuestionExtraPropsForm; qId: string }) => {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const features = form.values?.features?.[selectedLanguage] || {};
  const questions = form.values?.features?.[selectedLanguage]?.questions || [];
  const [newQuestion, setNewQuestion] = useState("");
  const [updateQuestion, setUpdateQuestion] = useState<{
    question: string;
    index: number;
  } | null>(null);
  const [opened, setOpened] = useState(false);
  const open = () => setOpened(true);
  const close = () => setOpened(false);
  const [error, setError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const { t: translations } = useTranslation();
  const handleAddQuestion = () => {
    if (!newQuestion.trim().length) return;
    if (questions?.find((question: string) => question.trim() === newQuestion.trim())) {
      setError(translations("Question already present"));
      return;
    }
    form.setFieldValue?.("features", {
      ...form.values?.features,
      [selectedLanguage]: {
        ...features,
        questions: [...questions, newQuestion],
      },
    });
    setError("");
    setNewQuestion("");
  };

  const handleDragEnd = ({ source, destination }: DropResult) => {
    const reorderedQuestions = reorder(questions, source.index, destination?.index || 0);
    form.setFieldValue?.("features", {
      ...form.values?.features,
      [selectedLanguage]: {
        ...features,
        questions: reorderedQuestions,
      },
    });
  };
  const handleUpdateQuestion = () => {
    if (questions[updateQuestion?.index ?? -1] == updateQuestion?.question) return;
    if (questions.includes(updateQuestion?.question ?? "")) {
      setUpdateError(translations("Question already present"));
      return;
    }
    form.setFieldValue?.("features", {
      ...form.values?.features,
      [selectedLanguage]: {
        ...features,
        questions: questions.map((q: string, index: number) =>
          index == updateQuestion?.index ? updateQuestion?.question : q,
        ),
      },
    });
    setUpdateQuestion(null);
    close();
  };

  const handleDeleteQuestion = (question: string) => {
    form.setFieldValue?.("features", {
      ...form.values?.features,
      [selectedLanguage]: {
        ...features,
        questions: questions.filter((q: string) => q !== question),
      },
    });
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <h5 className="text-sm font-semibold">{translations("Add Questions")}</h5>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dnd-list" direction="vertical">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {questions?.map((question: string, index: number) => (
                <Draggable key={question} index={index} draggableId={question}>
                  {(provided, snapshot) => (
                    <div
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-lg border-l-[3px] border-transparent bg-background px-3 py-2.5 transition-colors duration-150 hover:bg-muted",
                        snapshot.isDragging && "rounded-lg bg-background shadow-lg",
                      )}
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      style={provided.draggableProps.style as CSSProperties}
                    >
                      <div
                        {...provided.dragHandleProps}
                        className="flex shrink-0 items-center justify-center text-muted-foreground"
                      >
                        <IconGripVertical stroke={1.5} />
                      </div>
                      <div className="flex flex-1 items-center justify-between">
                        <span className="w-[600px]">{question}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          aria-label={translations("Edit")}
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setUpdateQuestion({ question, index });
                            open();
                          }}
                        >
                          <IconEdit />
                        </Button>
                        <Button
                          aria-label={translations("Delete")}
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeleteQuestion(question)}
                        >
                          <IconTrash className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <div className="flex gap-4">
        <Field data-invalid={!!error} className="flex-1">
          <Textarea
            className="flex-1"
            placeholder={translations("Enter question here")}
            value={newQuestion}
            onChange={(e) => {
              setError("");
              setNewQuestion(e.currentTarget.value);
            }}
            aria-invalid={!!error}
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>
        <Button onClick={handleAddQuestion}>
          <IconPlus data-icon="inline-start" />
          {translations("Add Question")}
        </Button>
      </div>
      <h5 className="text-sm font-semibold">Add Choices</h5>
      <ChoicesCreator form={form} qId={qId} surveyType={SurveyType.Web} />
      <Dialog
        open={opened}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translations("Edit Question")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <Field data-invalid={!!updateError} className="w-full">
              <Textarea
                value={updateQuestion?.question}
                onChange={(event) => {
                  setUpdateError("");
                  setUpdateQuestion({
                    index: updateQuestion?.index ?? 0,
                    question: event.target.value,
                  });
                }}
                aria-invalid={!!updateError}
              />
              {updateError && <FieldError>{updateError}</FieldError>}
            </Field>
            <Button onClick={handleUpdateQuestion}>{translations("Update Question")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MCQGridExtraProps;
