import { FastifyRequest, FastifyReply } from "fastify";
import {
  createListMessage,
  getEventType,
  getMessageObject,
  isValidResponse,
  parseMessage,
  parseResponse,
} from "./wasurvey.utils";
import {
  createSession,
  deleteSession,
  getFirstQuestionId,
  getSession,
  sendMessage,
  sendNextQuestion,
  sendQuestion,
  sendSurveyToWaCustomer,
  sendTextMessage,
  updateResponses,
  updateSession,
} from "./wasurvey.service";
import { WaSession, Survey } from "@prisma/client";
import { WaEvent, WaTemplateStatus } from "../../../types/enums";
import { log } from "../../../utils/logger";
import { ByOrgIdParams } from "../../org/org.schema";
import { getQuestionById } from "../../question/question.service";
import { getSurveyById } from "../../survey/survey.service";
import { getWaCustomerById, createWaCustomerSurveySendRecord } from "../customer/waCustomer/waCustomer.service";
import { getWaCustomersByWaCustomerGroupId, createWaCustomerGroupSurveySendRecord } from "../customer/waCustomerGroup/waCustomerGroup.service";
import { getTemplateWithHSMId, updateTemplateInDb, getTemplate } from "../messageTemplates/wa_templates.service";
import { getWaSettings } from "../settings/wa_settings.service";
import { SendSurveyToWaCustomerParams, SendSurveyToWaCustomerGroupParams } from "./wasurvey.schema";
import { WaMessageBody } from "../../../types/whatsapp.types";

// TODO: add as fastify schema
interface subscribeQuery {
  "hub.mode": string;
  "hub.verify_token": string;
  "hub.challenge": string;
}
export async function webhookSubscribeHandler(
  request: FastifyRequest<{
    Params: ByOrgIdParams;
  }>,
  reply: FastifyReply
) {
  try {
    const query = request.query as subscribeQuery;
    const orgId = request.params.orgId;
    const waSettings = await getWaSettings(orgId);
    if (!waSettings) {
      throw new Error("WA settings not found");
    }
    if (
      query["hub.mode"] === "subscribe" &&
      query["hub.verify_token"] === waSettings.webhookPassword
    ) {
      log.trace('Webhook subscription successful\n%o', { orgId })
      reply.code(200).send(query["hub.challenge"]);
    } else {
      reply.code(403).send("Error, wrong validation token");
    }
  } catch (e) {
    log.error(e)
    reply.code(500)
  }
}

// TODO: handle multiple changes (changes.length > 1)
// TODO: Check for usable types in whatsapp sdk (discontinued project)
export async function whatsappEventHandler(
  request: FastifyRequest<{
    Params: ByOrgIdParams;
  }>,
  reply: FastifyReply
) {
  try {
    const body = request.body as WaMessageBody;
    const { orgId } = request.params;
    // log.trace('WaEvent => %o', body); // Log all events
    const eventType = getEventType(body);
    if (!eventType) {
      // Probably a message delivery status. Ignoring...
      reply.code(200).send();
      return;
    } else if (eventType === WaEvent.Message) {
      log.trace("messageObject => %o", getMessageObject(body));
      await whatsappMessageHandler(orgId, body);
    } else if (eventType === WaEvent.TemplateStatusChange) {
      log.trace("template status change => %o", body);
      await templateStatusChangeHandler(body.entry[0].changes[0].value as any);
    }
  } catch (e) {
    log.error(e)
  } finally {
    reply.code(200).send();
  }
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

async function whatsappMessageHandler(orgId: string, waMessage: WaMessageBody) {
  // check for '/start' command
  const { message, from } = parseMessage(waMessage);
  log.trace('message => %s', message)
  if (message.startsWith("/start")) {
    await handleStartMessage(orgId, waMessage);
  } else {
    let session = await getSession(orgId, from);
    if (!session.currentQuestionId) {
      // If no current question, then we assume this is the consent message (template)
      if (!session.templateId) {
        throw new Error("TemplateId not found in session");
      }
      const dbTemplate = await getTemplate(session.templateId);
      if (message.toLocaleLowerCase() === dbTemplate.acceptButton.toLocaleLowerCase()) {
        log.trace('User consented to survey')
        const firstQId = await getFirstQuestionId(session.surveyId);
        session = await updateSession(orgId, from, { currentQuestionId: firstQId });
        log.trace('sending first question')
        await sendFirstQuestion(session);
      } else {
        // Delete session if user doesn't consent
        log.trace('User did not consent to survey. \n reply => %s \n acceptText => %s', message, dbTemplate.acceptButton)
        await sendTextMessage(session, 'No Worries', 'Have a great day!')
        await deleteSession(orgId, from);
        return;
      }
    } else {
      // WaCustomer is in the middle of a survey
      await handleReplyMessage(orgId, waMessage);
    }
  }
}

async function handleStartMessage(orgId: string, waMessage: WaMessageBody) {
  const { from, message } = parseMessage(waMessage);
  // delete any existing session if any
  await deleteSession(orgId, from);
  // create new session
  const surveyId = message.split(" ")[1]; // format: /start <surveyId>
  const survey = await getSurveyById(surveyId);
  const firstQId = await getFirstQuestionId(survey.id);

  if (survey.languages.length > 1) {
    const session = await createSession(from, survey.id, orgId, undefined, firstQId);
    await handleLanguageSelection(session, survey);
    return;
  }
  const session = await createSession(from, survey.id, orgId, undefined, survey.languages[0], firstQId);
  console.log(session)
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

async function handleReplyMessage(orgId: string, waMessage: WaMessageBody) {
  const { from, message } = parseMessage(waMessage);
  let session = await getSession(orgId, from);
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

  const response = await parseResponse(waMessage, question, session);
  log.trace('parsedResponse => %o', response)
  if (!isValidResponse(response, question, session.language)) {
    await sendTextMessage(session, "Invalid response. Please try again.", "");
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

  session = await updateResponses(session.orgId, session.phone, updatedResponses);
  await sendNextQuestion(session, message);
}

async function handleLanguageSelection(session: WaSession, survey: Survey) {
  if (survey.languages.length > 10) {
    throw new Error('Too many languages')
  }
  const message = createListMessage(
    session.phone,
    "Please select your preferred language",
    "",
    "View languages",
    survey.languages
  );
  await sendMessage(session.orgId, message);
}

async function handleLanguageResponse(session: WaSession, message: string) {
  const survey = await getSurveyById(session.surveyId);

  // if language is not valid, send error message
  if (survey.languages.includes(message)) {
    session = await updateSession(session.orgId, session.phone, { language: message });
    await sendFirstQuestion(session);
    return;
  } else {
    await sendTextMessage(
      session,
      "Invalid language. Please try again.",
      ""
    );
    return;
  }
}

// TODO: generalize above functions and optimize code
// TODO: create handleStartSurvey(surveyId, phone)
export async function sendSurveyToWaCustomerHandler(
  request: FastifyRequest<
    { Params: SendSurveyToWaCustomerParams }
  >,
  reply: FastifyReply
) {
  const { surveyId, waCustomerId, templateId } = request.params;
  const survey = await getSurveyById(surveyId);
  const dbTemplate = await getTemplate(templateId);
  const waCustomer = await getWaCustomerById(waCustomerId);
  if (!waCustomer) {
    throw new Error("WaCustomer not found");
  }
  if (!survey) {
    throw new Error("Survey not found");
  }
  const phone = waCustomer.phone;
  if (!phone) {
    throw new Error("WaCustomer phone number not found");
  }
  // TODO: throw error if there is a session already
  await deleteSession(dbTemplate.orgId, phone);
  await sendSurveyToWaCustomer(phone, survey, dbTemplate)
  await createWaCustomerSurveySendRecord(waCustomerId, surveyId, templateId);
  reply.code(200).send();
}

export async function sendSurveyToWaCustomerGroupHandler(
  request: FastifyRequest<{
    Params: SendSurveyToWaCustomerGroupParams
  }>,
  reply: FastifyReply
) {
  const { surveyId, waCustomerGroupId, templateId } = request.params;
  log.trace(`Preparing to send survey ${surveyId} to waCustomerGroup ${waCustomerGroupId}`);
  const survey = await getSurveyById(surveyId);
  const dbTemplate = await getTemplate(templateId);
  const waCustomers = await getWaCustomersByWaCustomerGroupId(waCustomerGroupId);
  log.trace('waCustomers %o', waCustomers)
  if (!survey) {
    throw new Error("Survey not found");
  }

  // TODO: limit rate of sending messages
  //TODO: Currently executing sequentially. We can parallelize this after implementing rate limiting
  for (const { phone, id: waCustomerId } of waCustomers) {
    try {
      await deleteSession(dbTemplate.orgId, phone);
    } catch (e) {
      log.error(e)
    }
    // TODO: remove tracking of group-send-record individually and assume
    // if waCustomer is in a group, then they have received the survey?
    await createWaCustomerSurveySendRecord(waCustomerId, surveyId, templateId);
    // TODO: We can only send templates first. Replace below with a template
    await sendSurveyToWaCustomer(phone, survey, dbTemplate)
  }

  await createWaCustomerGroupSurveySendRecord(waCustomerGroupId, surveyId, templateId);
  reply.code(200).send();
}
