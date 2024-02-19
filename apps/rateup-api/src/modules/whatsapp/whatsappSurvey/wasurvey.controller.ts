import { FastifyRequest, FastifyReply } from "fastify";
import {
  createListMessage,
  getEventType,
  getMessageObject,
  getQuestionByIdFromSession,
  isValidResponse,
  parseMessage,
  parseResponse,
} from "./wasurvey.utils";
import {
  createSession,
  deleteSession,
  getSession,
  handleTestimonialQuestion,
  handleTestimonialReply,
  saveResponses,
  sendMessage,
  sendNextQuestion,
  sendQuestion,
  sendSurveyToParticipant,
  sendTextMessage,
  updateSession,
} from "./wasurvey.service";
import {
  CampaignParticipantStatus,
  SurveyType,
  WaEvent,
  WaTemplateStatus,
  QuestionType,
  WaFlowStatus,
} from "../../../types/enums";
import { log } from "../../../utils/logger";
import { ByOrgIdParams } from "../../org/org.schema";
import {
  getTemplateWithHSMId,
  updateTemplateInDb,
  getDbTemplate,
} from "../messageTemplates/wa_templates.service";
import { getWaSettings } from "../settings/wa_settings.service";
import { WaMessageBody, WaMessageTypes } from "../../../types/whatsapp.types";
import { updateCampaignParticipant } from "../../campaign/campaignParticipants/campaignParticipants.service";
import prisma from "../../../utils/prisma";
import {
  getSurveyById,
  updateStartedSurvey,
  updateVisitedSurvey,
} from "../../survey/survey.service";
import { getIpFromToken } from "../redirect/wa_redirect.service";
import { generateQuestionResponsesFromFlowResponse } from "../flows/flow.utils";
import { getFlowFromDb, sendFlow } from "../flows/flow.service";
import { createResponse } from "../../response/response.service";

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
  reply: FastifyReply,
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
      log.trace("Webhook subscription successful\n%o", { orgId });
      reply.code(200).send(query["hub.challenge"]);
    } else {
      reply.code(403).send("Error, wrong validation token");
    }
  } catch (e) {
    log.error(e);
    reply.code(500);
  }
}

// TODO: handle multiple changes (changes.length > 1)
// TODO: Check for usable types in whatsapp sdk (discontinued project)
export async function whatsappEventHandler(
  request: FastifyRequest<{
    Params: ByOrgIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const body = request.body as WaMessageBody;
    const { orgId } = request.params;
    log.trace("WaEvent => %o", body); // Log all events
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
    log.error(e);
    log.trace("Error caught successfully");
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
  const dbTemplate = await getTemplateWithHSMId(
    changeValue.message_template_id.toString(),
  );
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
  const parsedMessage = parseMessage(waMessage);
  const { message, from, type } = parsedMessage;
  log.trace("message => %s", message);
  if (message.startsWith("/start")) {
    await handleStartMessage(orgId, waMessage);
  } else {
    let session = await getSession(orgId, from);
    if (parsedMessage.type === "nfm_reply") {
      // flow response
      await handleStaticFlowReply(orgId, waMessage);
    } else if (!session.currentQuestionId) {
      // If no current question, then we assume this is the consent message (template)
      if (!session.templateId) {
        throw new Error("TemplateId not found in session");
      }
      const dbTemplate = await getDbTemplate(session.templateId);
      if (
        message.toLocaleLowerCase() ===
        dbTemplate.acceptButton.toLocaleLowerCase()
      ) {
        log.trace("User consented to survey");

        updateStartedSurvey(session.surveyTeamMap.id)
          .then(() => {
            log.trace("started-survey-count incremented");
          })
          .catch((e) => log.error(e)); // increment started survey count

        if (session.surveyTeamMap.survey.type === SurveyType.WaFlow) {
          // if flow, send flow
          await sendFlow({
            orgId,
            phone: from,
            dbFlowId: session.surveyTeamMap.survey.WaFlow.dbFlowId,
          });
        } else {
          // if survey, send first question
          if (session.surveyTeamMap.survey.languages.length > 1) {
            // if multiple languages, show language selection
            updateSession(orgId, from, {
              currentQuestionId: (
                session.surveyTeamMap.survey.questions[0] as unknown as Question
              ).id,
            });
            await handleLanguageSelection(session);
            return;
          } else {
            // if only one language, set that as response-language
            session = await updateSession(orgId, from, {
              language: session.surveyTeamMap.survey.languages[0],
            });
          }

          log.trace("sending first question");
          await sendFirstQuestion(session);
        }
      } else {
        // Delete session if user doesn't consent
        log.trace(
          "User did not consent to survey. \n reply => %s \n acceptText => %s",
          message,
          dbTemplate.acceptButton,
        );
        await sendTextMessage(session, "No Worries", "Have a great day!");
        await deleteSession(orgId, from);
        return;
      }
    } else if (!session.language) {
      // If no language is set, then we assume this is the language selection
      await handleLanguageResponse(session, message);
      return;
    } else {
      // WaCustomer is in the middle of a survey
      await handleReplyMessage(orgId, waMessage);
    }
  }
}

async function handleStartMessage(orgId: string, waMessage: WaMessageBody) {
  const { from, message } = parseMessage(waMessage);
  log.trace("handling start message");
  // delete any existing session if any
  await deleteSession(orgId, from);
  // create new session
  const [_, surveyTeamMapId, ipToken] = message.split(" "); // format: /start <surveyTeamMapId>

  let ip = undefined;
  if (ipToken) {
    ip = await getIpFromToken(ipToken);
  }

  // TODO: handle invalid surveyTeamMapId
  let session = await createSession({
    phone: from,
    surveyTeamMapId,
    orgId,
    ip,
  });
  updateVisitedSurvey(session.surveyTeamMap.id)
    .then(() => {})
    .catch((e) => log.error(e)); // increment visited survey count
  updateStartedSurvey(session.surveyTeamMap.id)
    .then(() => {})
    .catch((e) => log.error(e)); // increment started survey count

  if (session.surveyTeamMap.survey.type === SurveyType.WaFlow) {
    session = await updateSession(orgId, from, {
      language: session.surveyTeamMap.survey.languages[0],
    });
    // FLOW
    await sendFlow({
      dbFlowId: session.surveyTeamMap.survey.WaFlow.dbFlowId,
      orgId,
      phone: from,
    });
  } else {
    // WaSurvey
    if (session.surveyTeamMap.survey.languages.length > 1) {
      updateSession(orgId, from, {
        currentQuestionId: (
          session.surveyTeamMap.survey.questions[0] as unknown as Question
        ).id,
      });
      await handleLanguageSelection(session);
      return;
    } else {
      session = await updateSession(orgId, from, {
        language: session.surveyTeamMap.survey.languages[0],
      });
    }
    await sendFirstQuestion(session);
  }
}

async function sendFirstQuestion(session: WaSessionWithRelations) {
  const firstQuestion = session.surveyTeamMap.survey
    .questions[0] as unknown as Question;
  await sendQuestion(firstQuestion!, session);
}

async function handleReplyMessage(orgId: string, waMessage: WaMessageBody) {
  const { from, message } = parseMessage(waMessage);
  let session = await getSession(orgId, from);
  if (!session) {
    // TODO: send error message
    return;
  }
  // save response
  const question = getQuestionByIdFromSession(
    session,
    session.currentQuestionId!,
  );
  if (!question) {
    throw new Error("Question not found");
  }
  if (question.type == QuestionType.Testimonial) {
    await handleTestimonialReply(waMessage, question, session);
  } else {
    const response = await parseResponse(waMessage, question, session);
    log.trace("parsedResponse => %o", response);
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

    session = await updateSession(session.orgId, session.phone, {
      responses: updatedResponses,
    });
    await sendNextQuestion(session, response);
  }
}

async function handleStaticFlowReply(orgId: string, waMessage: WaMessageBody) {
  log.trace("handling flow reply");
  const { from, flowResponse } = parseMessage(waMessage);
  if (flowResponse["responses_saved"]) {
    log.trace("Flow response already saved. Ignoring...");
    return;
  }
  let session = await getSession(orgId, from);
  const dbFlowId = session.surveyTeamMap.survey.WaFlow.dbFlowId;
  const flow = await getFlowFromDb(dbFlowId);

  const questionResponses = generateQuestionResponsesFromFlowResponse({
    flow,
    flowResponses: flowResponse,
    surveyTeamMapId: session.surveyTeamMapId,
  });

  session.responses = questionResponses;
  await saveResponses(session);
}

async function handleLanguageSelection(session: WaSessionWithRelations) {
  if (session.surveyTeamMap.survey.languages.length > 10) {
    throw new Error("Too many languages");
  }
  const message = createListMessage(
    session.phone,
    "",
    "Please select your preferred language",
    "View languages",
    session.surveyTeamMap.survey.languages,
  );
  await sendMessage(session.orgId, message);
}

async function handleLanguageResponse(
  session: WaSessionWithRelations,
  message: string,
) {
  const survey = session.surveyTeamMap.survey;

  // if language is not valid, send error message
  if (survey.languages.includes(message)) {
    session = await updateSession(session.orgId, session.phone, {
      language: message,
    });
    await sendFirstQuestion(session);
    return;
  } else {
    await sendTextMessage(session, "Invalid language. Please try again.", "");
    return;
  }
}

export async function sendSurveyToParticipants(campaignId: string) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId,
      },
      include: {
        campaignParticipants: {
          include: {
            contact: true,
          },
        },
        surveyTeamMap: {
          select: {
            id: true,
            survey: {
              select: {
                WaFlow: {
                  select: {
                    dbFlowId: true,
                    orgId: true,
                  },
                },
                languages: true,
                type: true,
              },
            },
          },
        },
      },
    });
    const dbTemplate = await getDbTemplate(campaign.waTemplateId);
    if (!dbTemplate) {
      throw new Error(`Template with id ${campaign.waTemplateId} not found`);
    }

    for (const { contact, id } of campaign.campaignParticipants) {
      if (!contact.phone) {
        log.warn("Contact %o does not have a phone number", contact);
        // TODO: handle this case. maybe send email?
        continue;
      }
      // TODO: add rate limiting
      // https://developers.facebook.com/docs/whatsapp/cloud-api/overview/#throughput
      let success = false;
      if (campaign.surveyTeamMap.survey.type === SurveyType.WaFlow) {
        success = await sendFlow({
          orgId: campaign.surveyTeamMap.survey.WaFlow.orgId,
          dbFlowId: campaign.surveyTeamMap.survey.WaFlow.dbFlowId,
          phone: contact.phone,
        });
      } else {
        success = await sendSurveyToParticipant({
          campaignParticipantId: id,
          phone: contact.phone,
          surveyTeamMapId: campaign.surveyTeamMap.id,
          dbTemplate,
        });
      }
      if (!success) {
        log.error("Error sending survey to participant %o", contact);
      } else {
        log.trace("Survey sent to participant %o", contact);
        await updateCampaignParticipant(id, {
          status: CampaignParticipantStatus.SENT,
        });
      }
    }
    log.trace("Survey sent to all participants");
    return true;
  } catch (e) {
    log.error(e);
    return false;
  }
}
