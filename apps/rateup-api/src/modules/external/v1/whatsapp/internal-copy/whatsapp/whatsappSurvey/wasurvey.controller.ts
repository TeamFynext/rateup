import { FastifyRequest, FastifyReply } from "fastify";
import {
  WaParsedMessage,
  createListMessage,
  createTemplateMessage,
  getEventType,
  getMessageObject,
  getQuestionByIdFromSession,
  isValidResponse,
  parseMessage,
  parseResponse,
  parseStartMessage,
  validateSession,
} from "./wasurvey.utils.js";
import {
  createSession,
  deleteSession,
  getSession,
  handleMessageStatusUpdate,
  handleTestimonialReply,
  sendMessage,
  sendNextQuestion,
  sendQuestion,
  sendTextMessage,
  updateSession,
} from "./wasurvey.service.js";

import {
  getTemplateWithHSMId,
  updateTemplateInDb,
  getDbTemplate,
} from "../messageTemplates/wa_templates.service.js";
import { getWaSettingsByPhoneId } from "../settings/wa_settings.service.js";
import { handleStaticFlowReply, sendFlow } from "../flows/flow.service.js";

import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import {
  CampaignParticipant,
  Contact,
} from "../../../../../../../../generated/prisma/client.js";
import { getFlowIdFromTemplateComponents } from "../messageTemplates/wa_templates.utils.js";
import {
  WaEvent,
  WaTemplateStatus,
  SurveyType,
  QuestionType,
  CampaignParticipantStatus,
  WaTemplateComponentType,
} from "../../../../../../../types/enums.js";
import { WaMessageBody } from "../../../../../../../types/whatsapp.types.js";
import { log } from "../../../../../../../utils/logger.js";
import prisma from "../../../../../../../utils/prisma.js";
import { getFileUrlFromKey } from "../../../../../../../utils/upload/s3Upload.js";
import {
  updateStartedSurvey,
  updateVisitedSurvey,
} from "../../../../../../survey/survey.service.js";
// import { handleRegisterMessage } from "../../../../../../loyalty/internal/campaign/campaign.service";
import {
  addWaMessageCampaignParticipantMap,
  updateCampaignParticipant,
} from "../../../../campaign/internal-copy/campaign/campaignParticipants/campaignParticipants.service.js";

// TODO: add as fastify schema
interface subscribeQuery {
  "hub.mode": string;
  "hub.verify_token": string;
  "hub.challenge": string;
}
export async function webhookSubscribeHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const query = request.query as subscribeQuery;
    if (
      query["hub.mode"] === "subscribe" &&
      query["hub.verify_token"] === process.env.wa_webhook_password
    ) {
      log.trace("Webhook subscription successful");
      reply.code(200).send(query["hub.challenge"]);
    } else {
      reply.code(403).send("Error, wrong validation token");
    }
  } catch (e) {
    log.error(e);
    reply.code(500);
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

async function handleWaSurveySession(
  orgId: string,
  waMessage: WaMessageBody,
  session: WaSessionWithRelations,
) {
  const parsedMessage = parseMessage(waMessage);

  const { message } = parsedMessage;
  if (!session.currentQuestionId) {
    // If no current question, then we assume this is the consent message (template)
    await handleSurveyConsentReply(orgId, parsedMessage, session);
  } else if (!session.language) {
    // If no language is set, then we assume this is the language selection
    await handleLanguageResponse(session, message);
  } else {
    // WaCustomer is in the middle of a survey
    await handleReplyMessage(orgId, waMessage);
  }
}

async function handleSurveyConsentReply(
  orgId: string,
  parsedMessage: WaParsedMessage,
  session: WaSessionWithRelations,
) {
  if (!session.templateId) {
    throw new Error("TemplateId not found in session");
  }

  const { message, from } = parsedMessage;
  const dbTemplate = await getDbTemplate(session.templateId);
  if (
    message.toLocaleLowerCase() === dbTemplate.acceptButton.toLocaleLowerCase()
  ) {
    await handleUserConsentedToSurvey(orgId, parsedMessage, session);
  } else {
    await handleUserDidntConsentToSurvey(orgId, parsedMessage, session);
  }
}

async function handleUserDidntConsentToSurvey(
  orgId: string,
  { from, message }: WaParsedMessage,
  session: WaSessionWithRelations,
) {
  // Delete session if user doesn't consent
  log.trace("User did not consent to survey. \n reply => %s", message);
  await sendTextMessage(session, "No Worries", "Have a great day!");
  await deleteSession(orgId, from);
}

async function handleUserConsentedToSurvey(
  orgId: string,
  { from }: any,
  session: WaSessionWithRelations,
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
}

async function handleStartMessage(orgId: string, waMessage: WaMessageBody) {
  log.trace("handling start message");

  const { from, message: fullMessage } = parseMessage(waMessage);
  const messageWithTagSplit = fullMessage.split("?t=");
  const message = messageWithTagSplit?.[0];
  const tag = messageWithTagSplit?.[1];

  const parsedStartMessage = parseStartMessage(message);
  if (!parsedStartMessage) {
    log.error("Not a valid start message");
    return;
  }

  const { surveyName, teamCode } = parsedStartMessage;
  const surveyTeamMap = await prisma.surveyTeamMap.findFirst({
    where: {
      survey: {
        title: surveyName,
      },
      team: {
        code: teamCode,
        orgId,
      },
    },
  });
  if (!surveyTeamMap) {
    log.error("surveyTeamMap not found with %o", {
      surveyName,
      teamCode,
      orgId,
    });
    return;
  }
  const surveyTeamMapId = surveyTeamMap?.id;

  if (!surveyTeamMapId) {
    log.error("surveyTeamMapId not found in message");
    return;
  }

  // TODO: handle invalid surveyTeamMapId
  await handleStartSurvey({
    from,
    surveyTeamMapId,
    orgId,
    tag,
  });
}

async function handleStartSurvey({
  from,
  surveyTeamMapId,
  orgId,
  ip,
  tag,
}: {
  from: string;
  surveyTeamMapId: string;
  orgId: string;
  ip?: string;
  tag?: string;
}) {
  await deleteSession(orgId, from);

  let session = await createSession({
    phone: from,
    surveyTeamMapId,
    orgId,
    ip,
    tag,
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

export async function sendCampaignToParticipants(
  campaignId: string,
  sendToStatuses: CampaignParticipantStatus[] = [
    CampaignParticipantStatus.PENDING,
    CampaignParticipantStatus.FAILED,
  ],
  participantId?: string,
) {
  try {
    log.trace(
      "Sending campaign to participants with statuses %o",
      sendToStatuses,
    );
    const campaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId,
      },
      include: {
        campaignParticipants: {
          include: {
            contact: {
              include: {
                customFields: {
                  select: {
                    value: true,
                    field: {
                      select: {
                        slug: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        team: {
          select: {
            id: true,
            orgId: true,
          },
        },
      },
    });

    const orgId = campaign.team.orgId;
    const dbTemplate = await getDbTemplate(campaign.waTemplateId);
    if (!dbTemplate) {
      throw new Error(`Template with id ${campaign.waTemplateId} not found`);
    }
    const components: any = [];
    const containsImage =
      dbTemplate.data.components.find(
        (c) => c.type.toLowerCase() === WaTemplateComponentType.HEADER,
      )?.format === `IMAGE`;

    if (containsImage) {
      if (!dbTemplate.defaultValues?.image?.link) {
        log.error("Image not found in template %o", dbTemplate);
        throw new Error(
          "Image not found in template. Please delete & create a new template.",
        );
      }
      components.push({
        type: "header",
        parameters: [
          {
            type: "image",
            image: {
              link: getFileUrlFromKey(dbTemplate.defaultValues.image.link),
            },
          },
        ],
      });
    }

    // check if template has a flow button
    const flowId = getFlowIdFromTemplateComponents(dbTemplate.data.components);
    let _campaignData = campaign;
    let _sendToStatuses = sendToStatuses;
    if (participantId) {
      let _participant = campaign?.campaignParticipants.find(
        (p) => p.id === participantId,
      );
      _campaignData.campaignParticipants = [_participant];
      _sendToStatuses = [_participant.status as CampaignParticipantStatus];
    }
    _sendCampaignToParticipants(
      _campaignData,
      _sendToStatuses,
      components,
      flowId,
      orgId,
      dbTemplate,
    )
      .then(() => {
        log.trace("Template sent to all participants");
      })
      .catch(() => {
        log.error("Error sending template to participants");
      });

    return true;
  } catch (e) {
    log.error(e);
    return false;
  }
}

type _campaign = {
  team: {
    id: string;
    orgId: string;
  };
  campaignParticipants: (CampaignParticipant & {
    contact: Contact & {
      customFields: {
        value: string;
        field: {
          slug: string;
        };
      }[];
    };
  })[];
};
// TODO: use batch sending
async function _sendCampaignToParticipants(
  campaign: _campaign,
  sendToStatuses: CampaignParticipantStatus[],
  components: any,
  flowId: string,
  orgId: string,
  dbTemplate: WaTemplateWithTypes,
) {
  for (const { contact, id, status } of campaign.campaignParticipants) {
    if (!sendToStatuses.includes(status as CampaignParticipantStatus)) {
      log.warn("Campaign already sent to participant %o. Skipping...", contact);
      continue;
    }
    if (!contact.phone) {
      log.warn("Contact %o does not have a phone number", contact);
      // TODO: handle this case. maybe send email?
      continue;
    }
    // TODO: add rate limiting
    // https://developers.facebook.com/docs/whatsapp/cloud-api/overview/#throughput
    const templateComponents = [...components];

    if (flowId) {
      log.trace("Flow button identified. handling session...");
      const existingSession = await getSession(orgId, contact.phone);
      if (existingSession) {
        if (validateSession(existingSession)) {
          await deleteSession(orgId, contact.phone);
        } else {
          log.warn("Session already exists for %o. Skipping...", contact);
          continue;
        }
      }
      const teamId = campaign.team.id;
      const surveyTeamMap = await prisma.surveyTeamMap.findFirst({
        where: {
          teamId,
          survey: {
            WaFlow: {
              flowId: flowId,
            },
          },
        },
        select: {
          id: true,
          survey: {
            select: {
              languages: true,
            },
          },
        },
      });
      await createSession({
        phone: contact.phone,
        surveyTeamMapId: surveyTeamMap.id,
        orgId: orgId,
        language: surveyTeamMap.survey.languages[0],
        campaignParticipantId: id,
      });

      templateComponents.push({
        type: "button",
        sub_type: "flow",
        index: 0,
        parameters: [
          {
            type: "action",
            action: {
              flow_token: contact.phone,
            },
          },
        ],
      });
    }

    const templateQuery = {
      name: dbTemplate.data.name,
      language: {
        code: dbTemplate.data?.language,
      },
      components: templateComponents,
    };
    const templateMessage = createTemplateMessage(contact.phone, templateQuery);

    const messageSentStatus = await sendMessage(orgId, templateMessage);

    log.trace("Template sent to participant %o", contact);
    await updateCampaignParticipant(id, {
      status: messageSentStatus.status
        ? CampaignParticipantStatus.SENT
        : CampaignParticipantStatus.FAILED,
      errorMessage: messageSentStatus.status ? "" : messageSentStatus.message,
      ...(messageSentStatus.status && { sentAt: new Date() }),
    });
    if (messageSentStatus.status)
      await addWaMessageCampaignParticipantMap(id, messageSentStatus.message);
  }
}
