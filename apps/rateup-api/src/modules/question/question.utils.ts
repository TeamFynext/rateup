import { Survey, WaSession } from "@prisma/client";
import { LogicAction } from "../../types/enums";
import { QuestionType as Q } from "../../types/enums";
import {
  sendMessage,
  sendTextMessage,
} from "../whatsappSurvey/wasurvey.service";
import { log } from "../../utils/logger";

/**
 * Returns a questionId, if a custom logic exists, or a LogicAction
 * @param survey
 * @param currentQ
 * @param currentResponse
 * @returns LogicAction | string
 */
export function getNextAction(
  questions: Array<Question>,
  currentQId: string,
  currentResponse: any
): LogicAction | string {
  const currentQ = questions.find((q) => q.id === currentQId);
  if (!currentQ) throw new Error("Question not found");

  const index = questions.indexOf(currentQ);
  if (index === -1) throw new Error("Question not found"); // this should never happen

  if (index < questions.length - 1) {
    // Not last question
    // Checking for logic jump
    const action = currentQ.logic?.[currentResponse];
    if (action) {
      // Performing logic jump
      if (action === LogicAction.NextQ) {
        return LogicAction.NextQ;
      } else if (action === LogicAction.EndSurvey) {
        // End survey
        return LogicAction.EndSurvey;
      } else {
        // Action is a question id
        const nextQ = questions.find((q) => q.id === action);
        if (!nextQ) {
          // quietly go to next question
          console.error(
            "Question not found. Invalid logic jump. Going to next question"
          );
          return LogicAction.NextQ;
        } else {
          return nextQ.id;
        }
      }
    }
    return LogicAction.NextQ;
  } else {
    // Survey completed
    return LogicAction.EndSurvey;
  }
}