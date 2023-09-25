import { FastifyRequest, FastifyReply } from "fastify";
import { WaMessageBody } from "../../types/whatsapp.types";
import {
  createListMessage,
  getEventType,
  isValidResponse,
  parseMessage,
} from "./wasurvey.utils";
import {
  createSession,
  deleteSession,
  getFirstQuestion,
  getSession,
  sendMessage,
  sendNextQuestion,
  sendQuestion,
  sendSurveyToRespondent,
  sendTextMessage,
  updateResponses,
  updateSession,
} from "./wasurvey.service";
import { getQuestionById } from "../question/question.service";
import { getSurveyById } from "../survey/survey.service";
import { Survey, WaSession } from "@prisma/client";
import { parseResponse } from "./wasurvey.utils";
import { SendSurveyToRGroupParams, SendSurveyToRespondentParams } from "./wasurvey.schema";
import { createRespondentSurveySendRecord, getRespondentById } from "../respondent/respondent/respondent.service";
import { log } from "../../utils/logger";
import { createRGroupSurveySendRecord, getRespondentsByRGroupId } from "../respondent/rgroup/rgroup.service";
import { getTemplate, getTemplateWithHSMId, updateTemplateInDb } from "../whatsapp/messageTemplates/wa_templates.service";
import { WaEvent, WaTemplateStatus } from "../../types/enums";

// TODO: add as fastify schema
interface subscribeQuery {
  "hub.mode": string;
  "hub.verify_token": string;
  "hub.challenge": string;
}
export function webhookSubscribeHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const query = request.query as subscribeQuery;
  if (
    query["hub.mode"] === "subscribe" &&
    query["hub.verify_token"] === process.env["WA_TOKEN"]
  ) {
    reply.code(200).send(query["hub.challenge"]);
  } else {
    reply.code(403).send("Error, wrong validation token");
  }
}

// TODO: handle multiple changes (changes.length > 1)
// TODO: Check for usable types in whatsapp sdk (discontinued project)
export async function whatsappEventHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = request.body as WaMessageBody;
  log.trace('WaEvent => %o', body);
  const eventType = getEventType(body);
  if (!eventType) {
    // Ignoring...
    reply.code(200).send();
    return;
  } else if (eventType === WaEvent.Message) {
    log.trace("message => %o", parseMessage(body));
    await whatsappMessageHandler(body);
  } else if (eventType === WaEvent.TemplateStatusChange) {
    log.trace("template status change => %o", body);
    await templateStatusChangeHandler(body.entry[0].changes[0].value as any);
  }

  reply.code(200).send();
}
interface changeValue {
  event: WaTemplateStatus;
  message_template_id: number;
  message_template_name: string;
  message_template_language: string;
  reason: string | null;
}

async function templateStatusChangeHandler(changeValue: changeValue) {
  const dbTemplate = await getTemplateWithHSMId(changeValue.message_template_id.toString());
  if (!dbTemplate) {
    log.error("Template not found in db");
    return false;
  } else {
    const waTemplate = dbTemplate.data;
    if (!Object.values(WaTemplateStatus).includes(changeValue.event)) {
      log.error("Invalid status change value");
      return false;
    }
    waTemplate.status = changeValue.event;
    await updateTemplateInDb(dbTemplate.id, waTemplate);
    return true;
  }
}

async function whatsappMessageHandler(waMessage: WaMessageBody) {
  // check for '/start' command
  const { message, from } = parseMessage(waMessage);
  if (message.startsWith("/start")) {
    await handleStartMessage(waMessage);
  } else {
    let session = await getSession(from);
    console.log(message)
    console.log(session.currentQuestionId)
    if (!session.currentQuestionId) {
      // If no current question, then we assume this is the consent message (template)
      const dbTemplate = await getTemplate(session.templateId);
      if (message.toLocaleLowerCase() === dbTemplate.acceptButton.toLocaleLowerCase()) {
        log.trace('User consented to survey')
        const firstQId = await getFirstQuestion(session.surveyId);
        session = await updateSession(from, { currentQuestionId: firstQId });
        await sendFirstQuestion(session);
      } else {
        // Delete session if user doesn't consent
        log.trace('User did not consent to survey. \n reply => %s \n acceptText => %s', message, dbTemplate.acceptButton)
        await deleteSession(from);
        return;
      }
    } else {
      // Respondent is in the middle of a survey
      await handleReplyMessage(waMessage);
    }
  }
}

async function handleStartMessage(waMessage: WaMessageBody) {
  const { from, message } = parseMessage(waMessage);
  // delete any existing session if any
  await deleteSession(from);
  // create new session
  const ids = message.split(" ")[1]; // format: /start <surveyId>/<templateId>
  const [surveyId, templateId] = ids.split("/");
  const survey = await getSurveyById(surveyId);
  const dbTemplate = await getTemplate(templateId) as WaTemplateWithTypes;
  if (survey.languages.length > 1) {
    await handleLanguageSelection(from, survey);
    await createSession(from, survey.id, dbTemplate.data.id);
    return;
  }
  const session = await createSession(from, survey.id, survey.languages[0]);
  await sendFirstQuestion(session);
}

async function sendFirstQuestion(session: WaSession) {
  const firstQuestion = await getQuestionById(
    session.surveyId,
    // TODO
    session.currentQuestionId!
  );
  await sendQuestion(firstQuestion!, session);
}

async function handleReplyMessage(waMessage: WaMessageBody) {
  const { from, message } = parseMessage(waMessage);
  let session = await getSession(from);
  if (!session) {
    // TODO: send error message
    return;
  }
  // If no language is set, then we assume this is the language selection
  if (!session.language) {
    await handleLanguageResponse(session, message);
    return;
  }
  // save response
  const question = await getQuestionById(
    session.surveyId,
    // TODO
    session.currentQuestionId!
  );
  if (!question) {
    throw new Error("Question not found");
  }

  const response = parseResponse(message, question, session);
  if (!isValidResponse(response, question, session.language)) {
    await sendTextMessage(from, "Invalid response. Please try again.", "");
    await sendQuestion(question, session);
    return;
  }
  const formattedResponse: QuestionResponse = {
    questionId: session.currentQuestionId!,
    response: {
      [question.type]: response,
    },
    type: question.type,
  };
  // Just to make sure we don't have any duplicate responses
  const currentResponses = (
    session.responses as unknown as Array<QuestionResponse>
  ).filter((r) => r.questionId !== session.currentQuestionId);
  const updatedResponses = [...currentResponses, formattedResponse] as any;

  await updateResponses(from, updatedResponses);
  await sendNextQuestion(session, message);
}

async function handleLanguageSelection(from: string, survey: Survey) {
  const message = createListMessage(
    from,
    "Please select your preferred language",
    "",
    "View languages",
    survey.languages
  );

  await sendMessage(message);
}

async function handleLanguageResponse(session: WaSession, message: string) {
  const survey = await getSurveyById(session.surveyId);

  // if language is not valid, send error message
  if (survey.languages.includes(message)) {
    session = await updateSession(session.phone, { language: message });
    await sendFirstQuestion(session);
    return;
  } else {
    await sendTextMessage(
      session.phone,
      "Invalid language. Please try again.",
      ""
    );
    return;
  }
}

// TODO: generalize above functions and optimize code
// TODO: create handleStartSurvey(surveyId, phone)
export async function sendSurveyToRespondentHandler(
  request: FastifyRequest<
    { Params: SendSurveyToRespondentParams }
  >,
  reply: FastifyReply
) {
  const { surveyId, respondentId, templateId } = request.params;
  const survey = await getSurveyById(surveyId);
  const dbTemplate = await getTemplate(templateId);
  const respondent = await getRespondentById(respondentId);
  if (!respondent) {
    throw new Error("Respondent not found");
  }
  if (!survey) {
    throw new Error("Survey not found");
  }
  const phone = respondent.phone;
  if (!phone) {
    throw new Error("Respondent phone number not found");
  }
  await deleteSession(phone);
  await sendSurveyToRespondent(phone, survey, dbTemplate)
  await createRespondentSurveySendRecord(respondentId, surveyId, templateId);
  reply.code(200).send();
}

export async function sendSurveyToRGroupHandler(
  request: FastifyRequest<{
    Params: SendSurveyToRGroupParams
  }>,
  reply: FastifyReply
) {
  const { surveyId, rgroupId, templateId } = request.params;
  log.trace(`Preparing to send survey ${surveyId} to rgroup ${rgroupId}`);
  const survey = await getSurveyById(surveyId);
  const dbTemplate = await getTemplate(templateId);
  const respondents = await getRespondentsByRGroupId(rgroupId);
  log.trace('respondents %o', respondents)
  if (!survey) {
    throw new Error("Survey not found");
  }

  // TODO: limit rate of sending messages
  // Currently executing sequentially. We can parallelize this after implementing rate limiting
  for (const { phone, id: respondentId } of respondents) {
    try {
      await deleteSession(phone);
    } catch (e) {
      log.error(e)
    }
    // TODO: remove tracking of group-send-record individually and assume
    // if respondent is in a group, then they have received the survey?
    await createRespondentSurveySendRecord(respondentId, surveyId, templateId);
    // TODO: We can only send templates first. Replace below with a template
    await sendSurveyToRespondent(phone, survey, dbTemplate)
  }

  await createRGroupSurveySendRecord(rgroupId, surveyId, templateId);
  reply.code(200).send();
}
