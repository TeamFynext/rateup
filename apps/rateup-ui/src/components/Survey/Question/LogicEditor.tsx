import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
// Logic-jump is also implemented in whatsapp surveys. Any modifications to logic-jump algorithm should be reflected in backend (questions/questions.util & whatsappSurvey module).
import { useId, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useQuestions,
  useQuestionUpdateMutation,
} from "@/backend/surveys/questions/questions.query";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { MultiSelect } from "@/components/ui/multi-select.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import type { QuestionType } from "@/types/enums.ts";
import { LogicAction, LogicCondition, QuestionType as Q } from "@/types/enums.ts";
import { logicSupportedTypes } from "@/utils/data.ts";
import { getContent } from "@/utils/index.ts";
import { getConditions, getResponses } from "@/utils/survey/logic/logic.utils";

const normalizeOptions = (responses: Array<string | { label: string; value: string }>) =>
  responses.map((r) => (typeof r === "string" ? { label: r, value: r } : r));

import { QuestionTabsEnum } from "../EditSurvey.tsx";

interface LogicEditorProps {
  selectedQ: Question;
  setActiveTab: React.Dispatch<React.SetStateAction<QuestionTabsEnum>>;
}

const LogicEditor = ({ selectedQ, setActiveTab }: LogicEditorProps) => {
  const params = useParams({ strict: false });
  const surveyId = params.surveyId as string;
  const { isLoading, isError, data: questions } = useQuestions(surveyId);
  const questionUpdateMutation = useQuestionUpdateMutation({ surveyId });
  const [currentLogicJumps, setCurrentLogicJumps] = useState<LogicJump[]>([]);
  const { t: translations } = useTranslation();

  useEffect(() => {
    setCurrentLogicJumps(selectedQ?.logic ?? []);
  }, [selectedQ]);

  if (!selectedQ || isLoading || isError) return <></>;

  const handleAddNewJump = () => {
    setCurrentLogicJumps((prev) => [
      ...prev,
      { condition: LogicCondition.Submitted, action: LogicAction.NextQ, response: "" },
    ]);
  };

  const handleSave = () => {
    toast.loading(translations("Hold on, your changes are getting updated.."), {
      id: "load-data",
    });
    questionUpdateMutation
      .mutateAsync({ qId: selectedQ.id, data: { logic: currentLogicJumps } })
      .then(() => setActiveTab(QuestionTabsEnum.Edit));
  };

  if (!logicSupportedTypes.includes(selectedQ.type as QuestionType)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <p>{translations("Logic is not supported for this question type")}</p>
          <Button variant="outline" onClick={() => setActiveTab(QuestionTabsEnum.Edit)}>
            {translations("Go Back")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-4">
          {currentLogicJumps.map((currentLogic, index) => (
            <ConditionBlock
              key={index}
              selectedQ={selectedQ}
              questions={questions ?? []}
              currentLogicJump={currentLogic}
              setCurrentLogicJump={(newLogicJump) =>
                setCurrentLogicJumps((prev) => prev.map((v, i) => (i === index ? newLogicJump : v)))
              }
              handleDelete={() =>
                setCurrentLogicJumps((prev) => prev.filter((_, i) => i !== index))
              }
            />
          ))}
          <Button variant="outline" size="sm" className="w-40  " onClick={handleAddNewJump}>
            <IconPlus />
            {translations("Add Logic Jump")}
          </Button>
        </div>
      </ScrollArea>
      <div className="flex justify-between border-t px-4 py-3">
        <Button variant="outline" onClick={() => setActiveTab(QuestionTabsEnum.Edit)}>
          {translations("Cancel")}
        </Button>
        <Button onClick={handleSave} disabled={questionUpdateMutation.isPending}>
          {translations("Save")}
        </Button>
      </div>
    </div>
  );
};

interface ConditionBlockProps {
  selectedQ: Question;
  questions: Array<Question>;
  currentLogicJump: LogicJump;
  setCurrentLogicJump: (newLogicJump: LogicJump) => void;
  handleDelete: () => void;
}

function ConditionBlock({
  selectedQ,
  questions,
  currentLogicJump,
  setCurrentLogicJump,
  handleDelete,
}: ConditionBlockProps) {
  const uid = useId();
  const { selectedLanguage } = useContext(SelectedLanguageContext);

  const currentIndex = questions.findIndex((q) => q.id === selectedQ.id);
  const possibleQuestions = questions.slice(currentIndex + 1);
  const possibleActions = [
    { label: "Next Question", value: LogicAction.NextQ },
    { label: "End Survey", value: LogicAction.EndSurvey },
    ...possibleQuestions.map((q) => ({
      label: `JUMP TO => ${questions.findIndex((q1) => q1.id === q.id) + 1}) ${
        getContent(q.title[selectedLanguage]) || q.description[selectedLanguage]
      }`,
      value: q.id,
    })),
  ];

  const [selectedCondition, setSelectedCondition] = useState(currentLogicJump.condition);
  const [selectedAction, setSelectedAction] = useState(currentLogicJump.action);
  const [matchData, setMatchData] = useState(currentLogicJump.response);
  const { t: translations } = useTranslation();

  // Initialise local state from prop on mount only.
  // We intentionally do NOT sync back via an effect — changes are pushed to the
  // parent directly in each onChange handler below, breaking the ping-pong loop.
  useEffect(() => {
    setSelectedCondition(currentLogicJump.condition);
    setMatchData(currentLogicJump.response);
    setSelectedAction(currentLogicJump.action);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isArrayCondition =
    [
      LogicCondition.IncludesAllOf,
      LogicCondition.IncludesAnyOf,
      LogicCondition.IncludesNoneOf,
    ].includes(selectedCondition) ||
    ((selectedQ.type === Q.MSQ || selectedQ.type === Q.DDMS) &&
      selectedCondition === LogicCondition.Equals);

  const conditionItems = getConditions(selectedQ.type as QuestionType).map((c: string) => ({
    label: c,
    value: c,
  }));

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-3 ">
        <p>If answer</p>

        <Field>
          <FieldLabel htmlFor={`${uid}-field`}>{translations("Condition")}</FieldLabel>
          <Select
            value={selectedCondition}
            onValueChange={(value) => {
              setSelectedCondition(value);
              setCurrentLogicJump({
                condition: value,
                action: selectedAction,
                response: matchData,
              });
            }}
            items={conditionItems}
          >
            <SelectTrigger id={`${uid}-field`} className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {conditionItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {selectedCondition !== LogicCondition.Submitted &&
          (isArrayCondition ? (
            <Field>
              <FieldLabel htmlFor={`${uid}-field-2`}>{translations("Match Data")}</FieldLabel>
              <MultiSelect
                id={`${uid}-field-2`}
                options={normalizeOptions(getResponses(selectedQ, selectedLanguage))}
                value={Array.isArray(matchData) ? matchData : []}
                onValueChange={(value) => {
                  setMatchData(value ?? "");
                  setCurrentLogicJump({
                    condition: selectedCondition,
                    action: selectedAction,
                    response: value ?? "",
                  });
                }}
                placeholder={translations("Select Responses")}
                className="w-[155px]"
              />
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor={`${uid}-field-3`}>{translations("Match Data")}</FieldLabel>
              <Select
                value={Array.isArray(matchData) ? "" : matchData}
                onValueChange={(value) => {
                  setMatchData(value ?? "");
                  setCurrentLogicJump({
                    condition: selectedCondition,
                    action: selectedAction,
                    response: value ?? "",
                  });
                }}
                items={normalizeOptions(getResponses(selectedQ, selectedLanguage))}
              >
                <SelectTrigger id={`${uid}-field-3`} className="w-[165px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {normalizeOptions(getResponses(selectedQ, selectedLanguage)).map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ))}

        <p>then</p>

        <Field className="flex-1">
          <FieldLabel htmlFor={`${uid}-field-4`}>{translations("Action")}</FieldLabel>
          <Select
            value={selectedAction}
            onValueChange={(value) => {
              setSelectedAction(value);
              setCurrentLogicJump({
                condition: selectedCondition,
                action: value,
                response: matchData,
              });
            }}
            items={possibleActions}
          >
            <SelectTrigger id={`${uid}-field-4`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {possibleActions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Button
          size="icon-xs"
          variant="outline"
          className="border-red-300 text-red-500 hover:bg-red-50 hover:text-red-500"
          onClick={handleDelete}
        >
          <IconTrash />
        </Button>
      </CardContent>
    </Card>
  );
}

export default LogicEditor;
// TODO: add checks for conflicts in logicJumps?
//       for example if there exists multiple conditions which matches a single response & has different actions,
//       then the logic is ambiguous and should not be allowed
