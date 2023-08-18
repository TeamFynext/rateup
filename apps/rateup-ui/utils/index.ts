import { LogicAction, LogicCondition, QuestionType } from "../types/enums";
import { logicSupportedTypes } from "./data";


export function getTimeSince(date: string) {
  //@ts-ignore
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = Math.floor(seconds / 31536000);

  if (interval >= 1) {
    return `${interval} year${interval === 1 ? '' : 's'} ago`;
  }

  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    return `${interval} month${interval === 1 ? '' : 's'} ago`;
  }

  interval = Math.floor(seconds / 86400);
  if (interval >= 2) {
    return `${interval} days ago`;
  } else if (interval === 1) {
    return 'Yesterday';
  }

  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    return `${interval} hour${interval === 1 ? '' : 's'} ago`;
  }

  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    return `${interval} minute${interval === 1 ? '' : 's'} ago`;
  }

  return `${Math.floor(seconds)} second${Math.floor(seconds) === 1 ? '' : 's'} ago`;
}

export function arrayEquals(a: Array<string>, b: Array<string>) {
  if (a.length !== b.length) return false;
  return a.every((val, index) => b.includes(val));
}

export function parseLogicAction(type: QuestionType, logicJumps: LogicJump[], userResponse: any): LogicAction | string {
  // Logic-jump is also implemented in whatsapp surveys. Any modifications to logic-jump algorithm should be reflected in backend (questions/questions.util & whatsappSurvey module).

  try {
    if (!logicSupportedTypes.includes(type) || !userResponse) {
      return LogicAction.NextQ
    }

    let flag = false;
    for (const logic of logicJumps) {
      switch (logic.condition) {
        case LogicCondition.Equals:
          if (type === QuestionType.MSQ) {
            flag = arrayEquals(userResponse, logic.response);
          } else {
            flag = userResponse === logic.response;
          }
          break;

        case LogicCondition.NotEquals:
          flag = userResponse !== logic.response;
          break;

        case LogicCondition.IncludesAllOf:
          if (type === QuestionType.MSQ) {
            flag = logic.response.every((val: string) => userResponse.includes(val));
          }
          break;

        case LogicCondition.IncludesAnyOf:
          if (type === QuestionType.MSQ) {
            flag = logic.response.some((val: string) => userResponse.includes(val));
          } else {
            flag = logic.response.includes(userResponse);
          }
          break;

        case LogicCondition.IncludesNoneOf:
          if (type === QuestionType.MSQ) {
            flag = logic.response.every((val: string) => !userResponse.includes(val));
          } else {
            flag = !logic.response.includes(userResponse);
          }
          break;

        case LogicCondition.Submitted:
          flag = true;
          break;

        default:
         // console.error("Invalid LogicCondition: ", logic.condition);
          break;
      }
      if (flag) {
        return logic.action;
      }
    }
    return LogicAction.NextQ;
  } catch (e) {
    // TODO: show error toast if in dev mode
   // console.error(e);
    return LogicAction.NextQ;
  }
}
