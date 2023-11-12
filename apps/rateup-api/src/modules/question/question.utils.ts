import { LogicAction, LogicCondition, QuestionType } from "../../types/enums";
import { QuestionType as Q } from "../../types/enums";
import { arrayEquals } from "../../utils/array";

// Copied from frontend. Update accordingly.
export const logicSupportedTypes  = [Q.LD, Q.YN, Q.Rating, Q.Smiley, Q.Opinion, Q.MCQ, Q.MSQ, Q.DDSS, Q.DDMS]
export function parseLogicAction(type: QuestionType, logicJumps: LogicJump[], userResponse: any): LogicAction | string {
// Logic-jump is also implemented in whatsapp surveys. Any modifications to logic-jump algorithm should be reflected in backend (questions/questions.util & whatsappSurvey module).

  try {
    if (!logicSupportedTypes.includes(type) || !userResponse || !logicJumps) {
      return LogicAction.NextQ
    }
    let flag = false;
    for (const logic of logicJumps) {
      switch (logic.condition) {
        case LogicCondition.Equals:
          if (type === QuestionType.MSQ || type === QuestionType.DDMS) {
            flag = arrayEquals(userResponse, logic.response);
          } else {
            flag = userResponse === logic.response;
          }
          break;

        case LogicCondition.NotEquals:
          flag = userResponse !== logic.response;
          break;

        case LogicCondition.IncludesAllOf:
          if (type === QuestionType.MSQ || type === QuestionType.DDMS) {
            flag = logic.response.every((val: string) => userResponse.includes(val));
          }
          break;

        case LogicCondition.IncludesAnyOf:
          if (type === QuestionType.MSQ || type === QuestionType.DDMS) {
            flag = logic.response.some((val: string) => userResponse.includes(val));
          } else {
            flag = logic.response.includes(userResponse);
          }
          break;

        case LogicCondition.IncludesNoneOf:
          if (type === QuestionType.MSQ || type === QuestionType.DDMS) {
            flag = logic.response.every((val: string) => !userResponse.includes(val));
          } else {
            flag = !logic.response.includes(userResponse);
          }
          break;

        case LogicCondition.Submitted:
          flag = true;
          break;

        default:
          console.error("Invalid LogicCondition: ", logic.condition);
          break;
      }
      if (flag) {
        return logic.action;
      }
    }
    return LogicAction.NextQ;
  } catch (e) {
    // TODO: show error toast if in dev mode
    console.error(e);
    return LogicAction.NextQ;
  }
}