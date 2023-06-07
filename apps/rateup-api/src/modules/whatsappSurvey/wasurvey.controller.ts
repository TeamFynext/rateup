import { FastifyRequest, FastifyReply } from "fastify";
import { WaMessageBody } from "../../types/whatsapp.types";
import {
  createListMessage,
  isValidResponse,
  parseMessage,
} from "./wasurvey.utils";
import {
  createSession,
  deleteSession,
  getSession,
  sendMessage,
  sendNextQuestion,
  sendQuestion,
  sendTextMessage,
  updateResponses,
  updateSession,
} from "./wasurvey.service";
import { getQuestionById } from "../question/question.service";
import { getSurveyById } from "../survey/survey.service";
import { Survey, WaSession } from "@prisma/client";
import { parseResponse } from "./wasurvey.utils";

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
  const { message } = parseMessage(waMessage);
  if (message.startsWith("/start")) {
    await handleStartMessage(waMessage);
  } else {
    await handleReplyMessage(waMessage);
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
    session.currentQuestionId
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
    session.currentQuestionId
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
    questionId: session.currentQuestionId,
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
