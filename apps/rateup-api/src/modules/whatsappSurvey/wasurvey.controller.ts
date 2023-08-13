import { FastifyRequest, FastifyReply } from "fastify";
import { WaMessageBody } from "../../types/whatsapp.types";
import {
  createListMessage,
  createTemplateMessage,
  isValidResponse,
  parseMessage,
} from "./wasurvey.utils";
import {
  createSession,
  deleteSession,
  getFirstQuestion,
  getSession,
  getSurveyConsentTemplate,
  getTemplates,
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
import prisma from "../../utils/prisma";

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

export async function whatsappEventHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = request.body as WaMessageBody;

  if (!body.entry[0].changes[0].value.messages) {
    // Not a message event. Probably a status update. Ignoring...
    reply.code(200).send();
    return;
  }
  console.log(JSON.stringify(body, null, 2));
  console.log(parseMessage(body));
  await whatsappMessageHandler(body);

  reply.code(200).send();
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
      // Survey Consent
      if (message.toLocaleLowerCase() === "yes") {
        const firstQId = await getFirstQuestion(session.surveyId);
        session = await updateSession(from, { currentQuestionId: firstQId });
        await sendFirstQuestion(session);
      } else {
        // Delete session if user doesn't consent
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
  const survey = await getSurveyById(message.split(" ")[1]);
  if (survey.languages.length > 1) {
    await handleLanguageSelection(from, survey);
    await createSession(from, survey.id);
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
  const { surveyId, respondentId } = request.params;
  const survey = await getSurveyById(surveyId);
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
  await sendSurveyToRespondent(phone, survey)
  await createRespondentSurveySendRecord(respondentId, surveyId);
  reply.code(200).send();
}

export async function sendSurveyToRGroupHandler(
  request: FastifyRequest<{
    Params: SendSurveyToRGroupParams
  }>,
  reply: FastifyReply
) {
  const { surveyId, rgroupId } = request.params;
  log.info(`Sending survey ${surveyId} to rgroup ${rgroupId}`);
  const survey = await getSurveyById(surveyId);
  const respondents = await getRespondentsByRGroupId(rgroupId);
  log.info(respondents)
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
    await createRespondentSurveySendRecord(respondentId, surveyId);
    // TODO: We can only send templates first. Replace below with a template
    console.log('Sending first question to respondent', phone)
    await sendSurveyToRespondent(phone, survey)
  }

  await createRGroupSurveySendRecord(rgroupId, surveyId);
  reply.code(200).send();
}

export async function getTemplatesHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const templates = await getTemplates();
  reply.code(200).send(templates);
}