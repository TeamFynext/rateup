import type { QuestionType } from "@/types/enums.ts";
import {
  LDResponse,
  LogicAction,
  LogicCondition,
  PageType,
  QuestionType as Q,
  SmileyResponse,
  WaQuestions,
  YNResponse,
} from "@/types/enums.ts";

import { ChoiceTypeQuestions } from "../../constants.ts";
import { logicSupportedTypes } from "../../data.ts";
import { getChoiceIndex } from "../../questions.ts";

export function parseLogicAction(
  question: Question,
  userResponse: Choice | string | Choice[] | number | boolean,
  language: string,
): LogicAction | string {
  // Logic-jump is also implemented in whatsapp surveys. Any modifications to logic-jump algorithm should be reflected in backend (questions/questions.util & whatsappSurvey module).

  try {
    if (typeof userResponse === "number") {
      userResponse = userResponse.toString();
    }
    const { type, logic: logicJumps = [] } = question;
    if (type === Q.InfoMessage || type in PageType) userResponse = true;
    if (!logicSupportedTypes.includes(type as QuestionType) || !userResponse) {
      return LogicAction.NextQ;
    }

    let flag = false;
    for (const logic of logicJumps) {
      let iterator!: "some" | "every";
      let comparator!: (value: string) => boolean;

      if (ChoiceTypeQuestions.includes(type as QuestionType)) {
        let userResponseIndices: string[];
        if (Array.isArray(userResponse)) {
          userResponseIndices = userResponse.map((choice) =>
            getChoiceIndex(choice, question.choices[language]).toString(),
          );
        } else {
          userResponseIndices = [
            getChoiceIndex(userResponse as Choice, question.choices[language]).toString(),
          ];
        }
        switch (logic.condition) {
          case LogicCondition.IncludesAllOf:
            iterator = "every";
            comparator = (choiceIndex) => userResponseIndices.includes(choiceIndex);
            break;

          case LogicCondition.IncludesAnyOf:
            iterator = "some";
            comparator = (choiceIndex) => userResponseIndices.includes(choiceIndex);
            break;

          case LogicCondition.IncludesNoneOf:
            iterator = "every";
            comparator = (choiceIndex) => !userResponseIndices.includes(choiceIndex);
            break;

          case LogicCondition.Equals:
            iterator = "every";
            comparator = (choiceIndex) => userResponseIndices.includes(choiceIndex);
            break;
          case LogicCondition.NotEquals:
            iterator = "every";
            comparator = (choiceIndex) => !userResponseIndices.includes(choiceIndex);
            break;

          default:
            break;
        }
        switch (logic.condition) {
          case LogicCondition.NotEquals:
          case LogicCondition.Equals:
            if (type === Q.MSQ || type === Q.DDMS) {
              // Multi-select logic always stores its response as a list of indices.
              flag = (logic.response as string[])[iterator](comparator);
            } else {
              flag = [logic.response as string][iterator](comparator);
            }
            break;

          case LogicCondition.IncludesAllOf:
          case LogicCondition.IncludesAnyOf:
          case LogicCondition.IncludesNoneOf:
            if (Array.isArray(logic.response)) {
              flag = logic.response[iterator](comparator);
            } else {
              throw new Error("Logic response should be an array");
            }
            break;

          case LogicCondition.Submitted:
            flag = true;
            break;

          default:
            // console.error("Invalid LogicCondition: ", logic.condition);
            break;
        }
      } else {
        // non-choice type questions
        switch (logic.condition) {
          case LogicCondition.Equals:
            flag = userResponse === logic.response;
            break;
          case LogicCondition.NotEquals:
            flag = userResponse !== logic.response;
            break;
          case LogicCondition.Submitted:
            flag = true;
            break;
        }
      }

      if (flag) {
        return logic.action;
      }
    }
    return LogicAction.NextQ;
  } catch (e) {
    // TODO: show error toast if in dev mode
    console.warn(e);
    return LogicAction.NextQ;
  }
}

const OpinionResponse = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const RatingResponse = ["1", "2", "3", "4", "5"];

export function getResponses(
  question: Question,
  selectedLanguage: string,
): Array<string | { label: string; value: string }> {
  try {
    switch (question.type) {
      case Q.LD:
        return Object.values(LDResponse);
      case Q.MCQ:
      case Q.MSQ:
      case Q.DDSS:
      case Q.DDMS:
      case Q.CustomNPS:
        return (
          question.choices[selectedLanguage].map((choice: Choice, index: number) => ({
            label: typeof choice.value === "object" ? choice.value?.title : choice.value,
            value: index.toString(),
          })) || []
        );
      case Q.YN:
        return Object.values(YNResponse);
      case Q.Opinion:
        return OpinionResponse;
      case Q.Rating:
        return RatingResponse;
      case Q.Smiley:
        return Object.values(SmileyResponse);
      default:
        console.log("type", question.type);
        throw new Error("Logic not implemented for question type");
    }
  } catch (e) {
    console.log(e);
    return [];
  }
}
/**
 * Callers pass either a survey `Question` or a WhatsApp flow form element, so the
 * parameter is only the three fields this actually reads.
 */
export function getResponses2(question: {
  metaType?: WaQuestions;
  /** WhatsApp flow questions carry choices under either spelling. */
  "data-source"?: { title: string }[];
  dataSource?: { title: string }[];
}): Array<string | { label: string; value: string }> | null {
  try {
    switch (question.metaType) {
      case WaQuestions.LD:
        return Object.values(LDResponse);
      case WaQuestions.RadioButtonsGroup:
      case WaQuestions.Dropdown:
      case WaQuestions.CheckboxGroup:
      case WaQuestions.Rating:
      case WaQuestions.Opinion:
      case WaQuestions.YN:
      case WaQuestions.Smiley:
      case WaQuestions.ChipsSelector:
        return (
          question?.["data-source"]?.map((source: { title: string }, index: number) => ({
            label: source.title,
            value: (index + 1)?.toString(),
          })) ??
          question?.dataSource?.map((source: { title: string }, index: number) => ({
            label: source.title,
            value: (index + 1)?.toString(),
          })) ??
          null
        );
      default:
        return null;
    }
  } catch (e) {
    console.log(e);
    return [];
  }
}

export function getConditions(qType: Q): Array<any> {
  switch (qType) {
    case Q.LD:
      return [LogicCondition.Equals, LogicCondition.NotEquals, LogicCondition.Submitted];
    case Q.MCQ:
    case Q.DDSS:
      return [
        LogicCondition.Equals,
        LogicCondition.NotEquals,
        LogicCondition.IncludesNoneOf,
        LogicCondition.IncludesAnyOf,
        LogicCondition.Submitted,
      ];
    case Q.YN:
      return [LogicCondition.Equals, LogicCondition.NotEquals, LogicCondition.Submitted];
    case Q.Opinion:
      return [LogicCondition.Equals, LogicCondition.NotEquals, LogicCondition.Submitted];
    case Q.Rating:
      return [LogicCondition.Equals, LogicCondition.NotEquals, LogicCondition.Submitted];
    case Q.Smiley:
      return [LogicCondition.Equals, LogicCondition.NotEquals, LogicCondition.Submitted];
    case Q.MSQ:
    case Q.DDMS:
      return [
        LogicCondition.IncludesNoneOf,
        LogicCondition.IncludesAnyOf,
        LogicCondition.IncludesAllOf,
        LogicCondition.Submitted,
      ];
    default:
      return [LogicCondition.Submitted];
  }
}
export function getConditionsv2(qType: WaQuestions): Array<any> {
  switch (qType) {
    case WaQuestions.LD:
    case WaQuestions.YN:
    case WaQuestions.Opinion:
    case WaQuestions.Rating:
    case WaQuestions.Smiley:
      return [LogicCondition.Equals, LogicCondition.NotEquals, LogicCondition.Submitted];
    case WaQuestions.RadioButtonsGroup:
    case WaQuestions.Dropdown:
      return [
        LogicCondition.Equals,
        LogicCondition.NotEquals,
        LogicCondition.IncludesNoneOf,
        LogicCondition.IncludesAnyOf,
        LogicCondition.Submitted,
      ];
    case WaQuestions.CheckboxGroup:
    case WaQuestions.ChipsSelector:
      return [
        LogicCondition.IncludesNoneOf,
        LogicCondition.IncludesAnyOf,
        LogicCondition.IncludesAllOf,
        LogicCondition.Submitted,
      ];
    default:
      return [LogicCondition.Submitted];
  }
}
