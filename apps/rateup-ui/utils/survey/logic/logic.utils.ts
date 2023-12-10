import {
  LogicAction,
  LogicCondition,
  QuestionType,
} from "../../../types/enums";
import { ChoiceTypeQuestions } from "../../constants";
import { logicSupportedTypes } from "../../data";
import { getChoiceIndex } from "../../questions";

export function parseLogicAction(
  question: Question,
  userResponse: Choice | string | Choice[] | number,
  language: string,
): LogicAction | string {
  // Logic-jump is also implemented in whatsapp surveys. Any modifications to logic-jump algorithm should be reflected in backend (questions/questions.util & whatsappSurvey module).

  try {
    if (typeof userResponse === "number") {
      userResponse = userResponse.toString();
    }
    const { type, logic: logicJumps } = question;
    if (!logicSupportedTypes.includes(type) || !userResponse) {
      return LogicAction.NextQ;
    }

    let flag = false;
    for (const logic of logicJumps) {
      let iterator: "map" | "some" | "every";
      let comparator: (value: string) => boolean;

      if (ChoiceTypeQuestions.includes(type)) {
        let userResponseIndices: string[];
        if (Array.isArray(userResponse)) {
          userResponseIndices = userResponse.map((choice) =>
            getChoiceIndex(choice, question.choices[language]).toString(),
          );
        } else {
          userResponseIndices = [
            getChoiceIndex(
              userResponse as Choice,
              question.choices[language],
            ).toString(),
          ];
        }
        switch (logic.condition) {
          case LogicCondition.IncludesAllOf:
            iterator = "every";
            comparator = (choiceIndex) =>
              userResponseIndices.includes(choiceIndex);
            break;

          case LogicCondition.IncludesAnyOf:
            iterator = "some";
            comparator = (choiceIndex) =>
              userResponseIndices.includes(choiceIndex);
            break;

          case LogicCondition.IncludesNoneOf:
            iterator = "every";
            comparator = (choiceIndex) =>
              !userResponseIndices.includes(choiceIndex);
            break;

          case LogicCondition.Equals:
            iterator = "every";
            comparator = (choiceIndex) =>
              userResponseIndices.includes(choiceIndex);
            break;
          case LogicCondition.NotEquals:
            iterator = "every";
            comparator = (choiceIndex) =>
              !userResponseIndices.includes(choiceIndex);
            break;

          default:
            break;
        }
        switch (logic.condition) {
          case LogicCondition.NotEquals:
          case LogicCondition.Equals:
            if (type === QuestionType.MSQ || type === QuestionType.DDMS) {
              flag = logic.response[iterator as string](comparator);
            } else {
              flag = [logic.response][iterator as string](comparator);
            }
            break;

          case LogicCondition.IncludesAllOf:
          case LogicCondition.IncludesAnyOf:
          case LogicCondition.IncludesNoneOf:
            if (Array.isArray(logic.response)) {
              flag = logic.response[iterator as string](comparator);
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
