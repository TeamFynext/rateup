import { FastifyRequest, FastifyReply } from "fastify";
import {
  WA_SUBSCRIBE_STATUS,
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
} from "./wasurvey.utils";
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
} from "./wasurvey.service";
import {
  CampaignParticipantStatus,
  SurveyType,
  WaEvent,
  WaTemplateStatus,
  QuestionType,
  WaTemplateComponentType,
  SubscriptionFeaturePathName,
} from "../../../types/enums";
import { log } from "../../../utils/logger";
import {
  getTemplateWithHSMId,
  updateTemplateInDb,
  getDbTemplate,
} from "../messageTemplates/wa_templates.service";
import { getWaSettingsByPhoneId } from "../settings/wa_settings.service";
import { WaMessageBody } from "../../../types/whatsapp.types";
import {
  addWaMessageCampaignParticipantMap,
  updateCampaignParticipant,
} from "../../campaign/campaignParticipants/campaignParticipants.service";
import prisma from "../../../utils/prisma";
import {
  updateStartedSurvey,
  updateVisitedSurvey,
} from "../../survey/survey.service";
import { handleStaticFlowReply, sendFlow } from "../flows/flow.service";
import { handleRegisterMessage } from "../../loyalty/internal/campaign/campaign.service";
import {
  checkIfMessageMatchesAnyAutomation,
  sendAutomatedReplyMessage,
} from "../automatedReply/wa_automatedReply.utils";
import { handleWaMessages } from "../inbox/message/wamessage.controller";
import { CampaignParticipant, Contact, WhatsappSettings } from "@prisma/client";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload";
import { getFlowIdFromTemplateComponents } from "../messageTemplates/wa_templates.utils";
import { handleContactConsent } from "../../contact/contact.service";
import { getOrgById } from "../../org/org.services";
import { checkMessageLimitExceeded } from "./wasurvey.auth";
import { updateMonthlyStat } from "../../stats/stats.service";
import { getLatestStatus } from "../../campaign/campaign.service";

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

// TODO: handle multiple changes (changes.length > 1)
// TODO: Check for usable types in whatsapp sdk (discontinued project)
export async function whatsappEventHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const body = request.body as WaMessageBody;
    log.trace("WaEvent => %o", body); // Log all events

    const eventType = getEventType(body);
    if (!eventType) {
      // Probably a message delivery status. Ignoring...
      return;
    } else if (
      [WaEvent.DELIVERED, WaEvent.READ, WaEvent.FAILED, WaEvent.SENT].includes(
        eventType,
      )
    ) {
      await handleMessageStatusUpdate(
        eventType,
        body?.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]?.id,
      );
      return;
    } else if (eventType === WaEvent.Message) {
      log.trace("messageObject => %o", getMessageObject(body));

      const phone_id = body.entry[0].changes[0].value.metadata.phone_number_id;
      const waSettings = await getWaSettingsByPhoneId(phone_id);
      if (!waSettings) {
        log.error("WaSettings not found for phone_id %s", phone_id);
        return;
      }

      await whatsappMessageHandler(waSettings, body);
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

async function whatsappMessageHandler(
  waSettings: Omit<WhatsappSettings, "accessToken_iv">,
  waMessage: WaMessageBody,
) {
  // check for '/start' command
  const parsedMessage = parseMessage(waMessage);
  const { orgId } = waSettings;
  const {
    message: tempMessage,
    from,
    type,
    completeMessageObject,
    userName,
  } = parsedMessage;

  await handleWaMessages(
    "receive",
    completeMessageObject,
    from,
    orgId,
    userName,
    waMessage?.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]?.id,
  );
  const message = tempMessage?.split("\n")?.slice(1)?.join(" ") || tempMessage;
  log.trace("message => %s", message);
  const messageLowerCase =
    type === "text" ? message?.trim()?.toLocaleLowerCase() : "";

  if (parseStartMessage(message)) {
    await handleStartMessage(orgId, waMessage);
  } else if (message.startsWith("/register")) {
    await handleRegisterMessage(orgId, waMessage);
  } else if (parsedMessage.type === "nfm_reply") {
    await handleStaticFlowReply(orgId, waMessage);
  } else if (
    messageLowerCase === WA_SUBSCRIBE_STATUS.STOP ||
    messageLowerCase === WA_SUBSCRIBE_STATUS.SUBSCRIBE
  ) {
    const isSubscribe = messageLowerCase === WA_SUBSCRIBE_STATUS.SUBSCRIBE;
    const consent = await handleContactConsent(orgId, from, isSubscribe);
    if (!consent) return;
    const org = await getOrgById(orgId);
    await sendTextMessage(
      { phone: from, orgId },
      "",
      isSubscribe
        ? `Great! You will now receive notifications from ${org.name}.`
        : `You have successfully opted out from receiving notifications from ${org.name}.If you wish to re-subscribe to notifications reply "SUBSCRIBE"`,
    );
  } else {
    let session = await getSession(orgId, from);
    // deleting session after 24hrs
    if (!validateSession(session)) {
      if (session) {
        await deleteSession(orgId, from);
        session = undefined;
      }
    }
    if (session) {
      await handleWaSurveySession(orgId, waMessage, session);
    } else {
      const automation = await checkIfMessageMatchesAnyAutomation(
        orgId,
        waMessage,
      );
      if (automation) {
        await sendAutomatedReplyMessage(orgId, parsedMessage, automation);
      }
    }
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
  if (session.surveyTeamMap.survey.type === SurveyType.WaFlow) {
    const msgLimit = await checkMessageLimitExceeded(orgId);
    if (!msgLimit) {
      log.error(
        "You have reached the maximum monthly limit of messages.",
        orgId,
      );
      return;
    }
  }
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
    orgId && updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
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
            contact: true,
            WaMessageCampaginParticipantMap: {
              include: {
                waMessage: {
                  select: {
                    stats: true,
                    waCreatedAt: true,
                  },
                },
              },
              orderBy: {
                waMessage: {
                  waCreatedAt: "desc",
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
    const components = convertComponentForSenting(dbTemplate);
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
      participantId,
    )
      .then(() => {
        log.trace("Template sent to all participants");
      })
      .catch((e) => {
        log.error(e);
        log.error("Error sending template to participants");
      });

    return true;
  } catch (e) {
    log.error(e);
    return false;
  }
}
function convertComponentForSenting(dbTemplate) {
  const containsImage =
    dbTemplate.data.components.find(
      (c) => c.type.toLowerCase() === WaTemplateComponentType.HEADER,
    )?.format === "IMAGE";

  const components = [];

  if (containsImage) {
    if (!dbTemplate.defaultValues?.image?.link) {
      console.error("Image not found in template %o", dbTemplate);
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

  dbTemplate.data.components.forEach((item) => {
    if (item.type?.toLowerCase() === WaTemplateComponentType.BUTTONS) {
      item?.buttons.forEach((button, idx) => {
        if (button.type === "URL") {
          components.push({
            type: "button",
            sub_type: "url",
            index: idx,
            parameters: [
              {
                type: "text",
                text: "9999",
              },
            ],
          });
        }
      });
    } else {
      // components.push(item);
      //skiping for now
    }
  });

  return components;
}
function updateButtonText(array, newText) {
  return (
    array.map((item) => {
      if (item.type === "button" && item.sub_type === "url") {
        return {
          ...item,
          parameters: item.parameters.map((param) => {
            if (param.type === "text") {
              return {
                ...param,
                text: newText,
              };
            }
            return param;
          }),
        };
      }
      return item;
    }) ?? []
  );
}
type _campaign = {
  team: {
    id: string;
    orgId: string;
  };
  campaignParticipants: (CampaignParticipant & {
    contact: Contact;
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
  individualParticipantId?: string,
) {
  const teamId = campaign.team.id;
  if (!teamId) {
    throw new Error("TeamId not found in campaign");
  }
  let surveyTeamMap;
  if (flowId) {
    surveyTeamMap = await prisma.surveyTeamMap.findFirst({
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
    if (!surveyTeamMap) {
      throw new Error("SurveyTeamMap not found for flowId " + flowId);
    }
  } else {
    log.trace("No flow button identified in template");
  }

  for (const participant of campaign.campaignParticipants) {
    const { contact, id } = participant;

    if (
      !individualParticipantId &&
      !sendToStatuses.includes(
        getStatusData(participant) as CampaignParticipantStatus,
      )
    ) {
      log.warn("Campaign already sent to participant %o. Skipping...", contact);
      continue;
    }
    if (!contact.consent) {
      log.warn("contact has no consent to sent %o. Skipping...", contact);
      continue;
    }
    if (!contact.phone) {
      log.warn("Contact %o does not have a phone number", contact);
      // TODO: handle this case. maybe send email?
      continue;
    }
    const updatedComponent = updateButtonText(components, contact.phone);

    // TODO: add rate limiting
    // https://developers.facebook.com/docs/whatsapp/cloud-api/overview/#throughput
    const templateComponents = [...updatedComponent];

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

      // creating session
      await createSession({
        phone: contact.phone,
        surveyTeamMapId: surveyTeamMap.id,
        orgId: orgId,
        language: surveyTeamMap.survey.languages[0],
        campaignParticipantId: id,
      });

      // adding flow button
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

    async function sendCampaignCallback(messageSentStatus: {
      status: boolean;
      message: any;
    }) {
      log.trace("Template sent to participant %o", contact);
      updateCampaignParticipant(id, {
        status: messageSentStatus.status
          ? CampaignParticipantStatus.SENT
          : CampaignParticipantStatus.FAILED,
        errorMessage: messageSentStatus.status ? "" : messageSentStatus.message,
        ...(messageSentStatus.status && { sentAt: new Date() }),
      });
      if (messageSentStatus.status) {
        await addWaMessageCampaignParticipantMap(id, messageSentStatus.message);
      }
    }

    updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
    await wait(50); // wait 50ms (throughput will be ~20 messages per second)
    sendMessage(orgId, templateMessage)
      .then(sendCampaignCallback)
      .catch((e) => {
        log.error("Could not send campaign to %s", contact.phone);
        log.error(e);
      });
  }
}

// Temporary rate limiting
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const getStatusData = (info) => {
  let statusData: string = (getLatestStatus(info) || "").toUpperCase();
  const FlowId = info?.campaign?.flowId;
  const participantStatus = info.status?.toUpperCase();
  const errorMessage = info.errorMessage;
  if (FlowId && participantStatus === CampaignParticipantStatus.COMPLETED) {
    statusData = CampaignParticipantStatus.COMPLETED;
  } else if (!statusData || errorMessage) {
    statusData = participantStatus;
  }
  return statusData ?? "";
};
