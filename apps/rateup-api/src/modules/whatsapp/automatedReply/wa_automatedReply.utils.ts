import { WaAutomatedReply } from "@prisma/client";
import {
  WaAutomatedReplyMatchType,
  WaAutomatedReplyResponseType,
} from "../../../types/enums";
import { WaMessageBody } from "../../../types/whatsapp.types";
import {
  WaParsedMessage,
  parseMessage,
} from "../whatsappSurvey/wasurvey.utils";
import { getAutomatedRepliesByOrgId } from "./wa_automatedReply.service";
import { sendTextMessage } from "../whatsappSurvey/wasurvey.service";
import { log } from "../../../utils/logger";

export function validateAutomationMatchCondition(
  automation: WaAutomatedReply,
  message: string,
): boolean {
  const { matchType, matchData } = automation;
  if (matchType === WaAutomatedReplyMatchType.Exact) {
    if (matchData.caseSensitive) {
      return message === matchData.exactText;
    } else {
      return message.toLowerCase() === matchData.exactText.toLowerCase();
    }
  } else if (
    [
      WaAutomatedReplyMatchType.ContainsAllOf,
      WaAutomatedReplyMatchType.ContainsAnyOf,
    ]
  ) {
    let comparator: "some" | "every";

    if (WaAutomatedReplyMatchType.ContainsAllOf === matchType)
      comparator = "every";
    if (WaAutomatedReplyMatchType.ContainsAnyOf === matchType)
      comparator = "some";

    if (matchData.caseSensitive) {
      return matchData.keywords[comparator]((keyword) =>
        message.includes(keyword),
      );
    } else {
      message = message.toLowerCase();
      return matchData.keywords[comparator]((keyword) =>
        message.includes(keyword.toLowerCase()),
      );
    }
  } else {
    throw new Error(`WaAutomation not implemented for: ${matchType}`);
  }
}

/**
 * If any automatedReplyCondition matches: returns the automation
 * if none of them matches: returns undefined
 */
export async function checkIfMessageMatchesAnyAutomation(
  orgId: string,
  waMessage: WaMessageBody,
) {
  const { message } = parseMessage(waMessage);
  const automatedReplies = await getAutomatedRepliesByOrgId(orgId);

  for (const automation of automatedReplies) {
    if (validateAutomationMatchCondition(automation, message)) {
      log.trace("Automation Matched! %o", automation);
      return automation;
    }
  }
}

export async function sendAutomatedReplyMessage(
  orgId: string,
  { from }: WaParsedMessage,
  automation: WaAutomatedReply,
) {
  const { responseType, responseText } = automation;

  if (responseType === WaAutomatedReplyResponseType.Template) {
    // TODO:
    throw new Error("Not implemented");
  } else if (responseType === WaAutomatedReplyResponseType.Text) {
    await sendTextMessage({ phone: from, orgId }, "", responseText);
  } else {
    throw new Error("Not implemented");
  }
}
