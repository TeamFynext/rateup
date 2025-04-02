import { FastifyRequest, FastifyReply } from "fastify";
import {
  WA_SUBSCRIBE_STATUS,
  WaParsedMessage,
  convertNodeToWhatsAppMessage,
  createListMessage,
  createReplyButtonsMessage,
  createTemplateMessage,
  getEventType,
  getMessageObject,
  getQuestionByIdFromSession,
  handlePaymentConfirmation,
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
  WaTemplateSupportedFormats,
  CampaignStatus,
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
import {
  getFlowWithSurveyTeamMapIdsWithDbFlowId,
  handleStaticFlowReply,
  sendFlow,
} from "../flows/flow.service";
import { checkIfMessageMatchesAnyAutomation } from "../automatedReply/wa_automatedReply.utils";
import { handleWaMessages } from "../inbox/message/wamessage.controller";
import {
  CampaignParticipant,
  Chatbot,
  Contact,
  WhatsappSettings,
} from "@prisma/client";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload";
import { getFlowIdFromTemplateComponents } from "../messageTemplates/wa_templates.utils";
import {
  getContactByPhoneNumberAndOrgId,
  handleContactConsent,
} from "../../contact/contact.service";
import { getOrgById } from "../../org/org.services";
import { checkMessageLimitExceeded } from "./wasurvey.auth";
import { updateMonthlyStat } from "../../stats/stats.service";
import {
  getLatestStatus,
  updateCampaign,
} from "../../campaign/campaign.service";
import {
  getLoyaltyWaCommandByRequestMessage,
  handleLoyaltyWaCommand,
} from "../../loyalty/settings/settings.service";
import dayjs from "dayjs";
import { getSubscription, getUsageStats } from "../../campaign/campaign.auth";
import { createJWT } from "../../../utils/jwt";
import {
  getAIResponseForQuery,
  getChatbotDetails,
} from "../../chatbot/chatbot.service";
import { sendTemplateToUserCore } from "../messageTemplates/wa_templates.controller";
import { NodeTypeMap, TypedNode } from "./node-types";
import {
  logAutomationAction,
  findRecentAutomation,
} from "./automation-logger.utils";
import { autoGenerateTicket } from "../../ticket/ticketCard/card.service";

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
    log.trace("WaEvent => %o", body); // Log the entire event payload

    const eventType = getEventType(body);
    if (!eventType) {
      return;
    }

    switch (eventType) {
      case "captured":
        await handleCapturedEvent(body);
        break;

      case WaEvent.Message:
        await handleMessageEvent(body);
        break;

      case WaEvent.TemplateStatusChange:
        await handleTemplateStatusChange(body);
        break;
      case WaEvent.TemplateCategoryUpdate:
        await handleTemplateCategoryChange(body);
        break;

      case WaEvent.DELIVERED:
      case WaEvent.READ:
      case WaEvent.FAILED:
      case WaEvent.SENT:
        await handleMessageStatusEvent(body, eventType);
        break;

      default:
        log.warn("Unhandled event type: %s", eventType);
    }
  } catch (error) {
    log.error("Error in whatsappEventHandler: %o", error);
  } finally {
    reply.code(200).send();
  }
}

// Utility: Wrap async functions to handle errors
async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  errorHandler: (error: any) => void,
): Promise<T | void> {
  try {
    return await operation();
  } catch (error) {
    errorHandler(error);
  }
}

// Handler: Payment confirmation for captured events
async function handleCapturedEvent(body: WaMessageBody) {
  const promises = (body.entry || []).flatMap((entry) =>
    (entry.changes || []).flatMap((change) =>
      (change.value?.statuses || []).map((status) =>
        safeAsyncOperation(
          () =>
            handlePaymentConfirmation(
              status.recipient_id,
              status.payment?.reference_id,
            ),
          (error) =>
            log.error(
              `Error handling payment confirmation for recipient_id ${status.recipient_id}: %o`,
              error,
            ),
        ),
      ),
    ),
  );

  await Promise.all(promises);
}

// Handler: Manage incoming WhatsApp messages
async function handleMessageEvent(body: WaMessageBody) {
  log.trace("messageObject => %o", getMessageObject(body));

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const phoneId = change.value?.metadata?.phone_number_id;
      const waSettings = await getWaSettingsByPhoneId(phoneId);

      if (!waSettings) {
        log.error("WaSettings not found for phone_id: %s", phoneId);
        continue;
      }

      await safeAsyncOperation(
        () => whatsappMessageHandler(waSettings, body),
        (error) => {
          log.error(error);
          log.error(
            "Error processing WhatsApp message for phone_id %s: %o",
            phoneId,
            error,
          );
        },
      );
    }
  }
}

// Handler: Manage template status changes
async function handleTemplateStatusChange(body: WaMessageBody) {
  const promises = (body.entry || []).flatMap((entry) =>
    (entry.changes || []).map((change) =>
      safeAsyncOperation(
        () => templateStatusChangeHandler(change.value as any),
        (error) =>
          log.error(
            `Error handling template status change for template id ${JSON.stringify(
              change.value,
            )}: %o`,
            error,
          ),
      ),
    ),
  );

  await Promise.all(promises);
}

async function handleTemplateCategoryChange(body: WaMessageBody) {
  const promises = (body.entry || []).flatMap((entry) =>
    (entry.changes || []).map((change) =>
      safeAsyncOperation(
        () => templateCategoryChangeHandler(change.value as any),
        (error) =>
          log.error(
            `Error handling template category change for template id ${JSON.stringify(
              change.value,
            )}: %o`,
            error,
          ),
      ),
    ),
  );

  await Promise.all(promises);
}

// Handler: Update message statuses
async function handleMessageStatusEvent(
  body: WaMessageBody,
  eventType: WaEvent,
) {
  const promises = (body.entry || []).flatMap((entry) =>
    (entry.changes || []).flatMap((change) =>
      (change.value?.statuses || []).map((status) =>
        safeAsyncOperation(
          () => handleMessageStatusUpdate(eventType, status.id, status.errors),
          (error) =>
            log.error(
              `Error handling message status update for status id ${status.id}: %o`,
              error,
            ),
        ),
      ),
    ),
  );

  await Promise.all(promises);
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

interface TemplateCategoryChange {
  message_template_id: number;
  message_template_name: string;
  message_template_language: string;
  previous_category: string;
  new_category: string;
}
async function templateCategoryChangeHandler(
  changeValue: TemplateCategoryChange,
) {
  const dbTemplate = await getTemplateWithHSMId(
    changeValue.message_template_id.toString(),
  );
  if (!dbTemplate || !changeValue.new_category) {
    log.error("Template not found in db");
    return false;
  } else {
    const waTemplate = dbTemplate.data;
    waTemplate.category = changeValue.new_category;
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
    type === "text" || type === "interactive"
      ? message?.trim()?.toLocaleLowerCase()
      : "";
  const loyaltyWaCommand = await getLoyaltyWaCommandByRequestMessage(
    orgId,
    message,
  );
  const chatbot = await getChatbotDetails(orgId);
  if (loyaltyWaCommand) {
    await handleLoyaltyWaCommand(from, userName, loyaltyWaCommand);
  } else if (!!parseStartMessage(message)) {
    await handleStartMessage(orgId, waMessage);
  } else if (parsedMessage.type === "nfm_reply") {
    await handleStaticFlowReply(orgId, waMessage);
  } else if (
    messageLowerCase === WA_SUBSCRIBE_STATUS.STOP ||
    messageLowerCase === WA_SUBSCRIBE_STATUS.SUBSCRIBE
  ) {
    await handleSubscriptionStatus(orgId, from, messageLowerCase);
  } else if (chatbot?.enableWaChat && message.startsWith(chatbot?.waCommand)) {
    await handleAiWaChat(chatbot, message, orgId, from);
  } else {
    let session = await getSession(orgId, from);
    // deleting session after 24hrs
    if (!validateSession(session)) {
      if (session) {
        await deleteSession(orgId, from);
        session = undefined;
      }
    }
    // handle automated reply
    await handleAutomatedReply(orgId, waMessage, parsedMessage, from, chatbot);

    // if (session) {
    //   await handleWaSurveySession(orgId, waMessage, session);
    // }
  }
}

async function handleAiWaChat(
  chatbot,
  message: string,
  orgId: string,
  phone: string,
) {
  try {
    const contact = await getContactByPhoneNumberAndOrgId(phone, orgId);
    if (chatbot.enableAllWaChat && !contact.aiWaChat) {
      log.trace("Ai chat is disabled for phone: %s", phone);
      return;
    }
    const jwtToken = await createJWT({
      userId: contact.id,
      orgId,
      role: "Contact",
    });

    const query = message.slice(chatbot?.waCommand?.length);
    const response = await getAIResponseForQuery(
      { query, userId: contact.id, orgId, customPrompt: chatbot?.waPrompt },
      jwtToken,
    );
    if (response) await sendTextMessage({ phone, orgId }, null, response);
    else
      await sendTextMessage(
        { phone, orgId },
        null,
        "Unable to reply. Something went wrong!",
      );
  } catch (e) {
    log.error(e);
    await sendTextMessage(
      { phone, orgId },
      null,
      "Unable to reply. Something went wrong!",
    );
  }
}

async function handleSubscriptionStatus(
  orgId: string,
  phone: string,
  message: string,
) {
  const isSubscribe = message === WA_SUBSCRIBE_STATUS.SUBSCRIBE;
  const consent = await handleContactConsent(orgId, phone, isSubscribe);
  if (!consent) return;
  const org = await getOrgById(orgId);
  if (isSubscribe) {
    await sendTextMessage(
      { phone, orgId },
      "",
      `Great! You will now receive notifications from ${org.name}.`,
    );
  } else {
    await sendMessage(
      orgId,
      createReplyButtonsMessage(
        phone,
        "",
        `You have successfully opted out from receiving notifications from ${org.name}.If you wish to re-subscribe to notifications click on "SUBSCRIBE" button`,
        ["SUBSCRIBE"],
      ),
    );
  }
}

/**
 * Handles automated replies for WhatsApp messages
 * @param orgId Organization ID
 * @param waMessage WhatsApp message body
 * @param parsedMessage Parsed message data
 * @param phone User's phone number
 * @param chatbot Chatbot configuration
 */
async function handleAutomatedReply(
  orgId: string,
  waMessage: WaMessageBody,
  parsedMessage: WaParsedMessage,
  phone: string,
  chatbot: Chatbot,
) {
  try {
    // Case 1: User clicked a button in a previous message
    if (parsedMessage?.buttonId) {
      // Use the utility function instead of duplicating the query
      const recentInteraction = await findRecentAutomation(phone, orgId, {
        timeWindow: 24 * 60 * 60 * 1000, // 24 hours
      });

      const automation = recentInteraction?.waAutomatedReply as {
        id: string;
        matchData: { json: { nodes: any[]; edges: any[] } };
      };
      if (!automation) {
        log.warn(`No active automation found for button click from ${phone}`);
        return;
      }

      // Log button click action using the utility function
      const automationLog = await logAutomationAction({
        phone,
        nodeId: recentInteraction.currentNode,
        automationId: automation.id,
        orgId,
        response: {
          value: parsedMessage?.message,
          buttonId: parsedMessage.buttonId,
          action: "button_click",
        },
      });

      // Find the next node based on the button clicked
      const nextNode = automation?.matchData?.json?.edges.find(
        (edge: any) => edge.sourceHandle === parsedMessage.buttonId,
      );

      if (nextNode?.target) {
        await processNextNode(
          phone,
          automation,
          nextNode.target,
          orgId,
          automationLog?.id,
        );
      } else {
        log.warn(`No next node found for buttonId ${parsedMessage.buttonId}`);
      }
    }
    // Case 2: New message from user
    else {
      // Check if message matches any automation rules
      const automation = (await checkIfMessageMatchesAnyAutomation(
        orgId,
        waMessage,
      )) as {
        id: string;
        matchData: { json: { nodes: any[]; edges: any[] } };
      } | null;

      if (automation) {
        // Start a new automation flow
        const startNode = automation?.matchData?.json?.nodes?.find(
          (node: any) => node.type === "startNode",
        );

        if (!startNode) {
          log.error(`No start node found in automation ${automation.id}`);
          return;
        }

        // Create record of this interaction using the utility function
        const automationLog = await logAutomationAction({
          phone,
          nodeId: startNode.id,
          automationId: automation.id,
          orgId,
          response: {
            value: parsedMessage?.message,
            action: "initial_interaction",
          },
        });

        await processNextNode(
          phone,
          automation,
          startNode.id,
          orgId,
          automationLog?.id,
        );
      }
      // Case 3: No matching automation rules found
      else {
        // Check if user has interacted within the last 24 hours
        const recentActivity = await findRecentAutomation(phone, orgId, {
          timeWindow: 24 * 60 * 60 * 1000, // 24 hours
        });

        // Only respond if this is the first message in 24 hours
        if (!recentActivity) {
          if (chatbot?.enableWaChat && chatbot?.enableAllWaChat) {
            // Handle AI chat if enabled
            await handleAiWaChat(chatbot, parsedMessage.message, orgId, phone);
          } else {
            // Send default welcome automation if available
            await handleInitialInteraction(orgId, phone, parsedMessage.message);
          }
        }
      }
    }
  } catch (error) {
    log.error("Error handling automated reply: %o", error);
  }
}

/**
 * Process a node in the automation flow and move to the next node if applicable
 * @param userPhone User's phone number
 * @param automation The automation flow data
 * @param nodeId Current node ID to process
 * @param orgId Organization ID
 */
export async function processNextNode(
  userPhone: string,
  automation: any,
  nodeId: string,
  orgId: string,
  automationMessageId: string,
) {
  try {
    if (!nodeId || !automation?.matchData?.json?.nodes) {
      log.error("Invalid node ID or automation data");
      return;
    }

    // Find the current node
    const node: TypedNode & {
      data: {
        template?: {
          id: string;
          name: string;
        };
        flow?: {
          id: string;
          name: string;
        };
        parameters?: any[];
        teamId?: string;
      };
    } = automation.matchData?.json?.nodes.find((n: any) => n.id === nodeId);

    if (!node) {
      log.error(`Node with ID ${nodeId} not found in automation flow`);
      return;
    }

    // Skip processing for special nodes
    if (["endNode", "startNode"].includes(node?.type)) {
      // If end node, mark interaction as completed
      if (node?.type === "endNode") {
        await prisma.waAutomatedReplyMessage.updateMany({
          where: { phone: userPhone, waAutomatedReplyId: automation.id },
          data: { status: "completed" },
        });
      }

      // For start node, just move to the next node
      const nextEdge = automation.matchData?.json?.edges.find(
        (edge: any) => edge.source === nodeId,
      );

      if (nextEdge) {
        await prisma.waAutomatedReplyMessage.updateMany({
          where: { phone: userPhone, waAutomatedReplyId: automation.id },
          data: { currentNode: nextEdge.target },
        });

        await processNextNode(
          userPhone,
          automation,
          nextEdge.target,
          orgId,
          automationMessageId,
        );
      }

      return;
    }

    // Process different node types
    switch (node.type) {
      case "flowNode":
        await handleFlowNode(node, userPhone, orgId);
        break;

      case "templateNode":
        await sendTemplateToUserCore(
          orgId,
          node?.data?.template?.id,
          userPhone,
          node?.data?.parameters ?? [],
          node?.data?.teamId,
        );
        break;
      case "ticketNode":
        const typedData = node?.data as NodeTypeMap["ticketNode"];
        await autoGenerateTicket({
          ticketColumnId: typedData?.ticket?.selectedBoardColumnId,
          waAutomatedReplyMessageId: automationMessageId,
          type: "AUTOMATION",
        });
        break;
      case "delayNode":
        await wait((node?.data as NodeTypeMap["delayNode"])?.delayTime * 1000);
        break;

      default:
        // For text, buttons, and other message types
        const waMessage: any = convertNodeToWhatsAppMessage(node, userPhone);
        await sendMessage(orgId, waMessage);
        break;
    }

    // Find and process next node unless current node requires user input
    const requiresUserInput = [
      "buttonNode",
      "flowNode",
      "listNode",
      "ticketNode",
    ].includes(node?.type);
    const nextEdge = automation.matchData?.json?.edges.find(
      (edge: any) => edge.source === nodeId,
    );

    if (nextEdge) {
      await prisma.waAutomatedReplyMessage.updateMany({
        where: { phone: userPhone, waAutomatedReplyId: automation.id },
        data: { currentNode: nextEdge.target },
      });

      if (!requiresUserInput) {
        await processNextNode(
          userPhone,
          automation,
          nextEdge.target,
          orgId,
          automationMessageId,
        );
      }
    } else {
      // No next node, mark as completed
      await prisma.waAutomatedReplyMessage.updateMany({
        where: { phone: userPhone, waAutomatedReplyId: automation.id },
        data: { status: "completed" },
      });
    }
  } catch (error) {
    log.error(`Error processing node ${nodeId}: ${error.message}`);
  }
}

/**
 * Handle processing of a flow node
 * @param node Flow node to process
 * @param userPhone User's phone number
 * @param orgId Organization ID
 */
async function handleFlowNode(node: any, userPhone: string, orgId: string) {
  try {
    const flowId = node?.data?.flow?.id;
    const teamId = node?.data?.teamId;

    if (!flowId) {
      throw new Error("Flow ID not found in node data");
    }

    // Clear any existing session
    await deleteSession(orgId, userPhone);

    // Get flow data
    const dbFlow = await getFlowWithSurveyTeamMapIdsWithDbFlowId(flowId);

    if (!dbFlow) {
      throw new Error(`Flow with ID ${flowId} not found`);
    }

    // Find survey team map
    const surveyTeamMap = dbFlow?.survey?.teams?.find(
      (team) => team?.teamId === teamId,
    );

    if (!surveyTeamMap) {
      throw new Error(`No survey team map found for team ID ${teamId}`);
    }

    // Create a new session
    await createSession({
      phone: userPhone,
      surveyTeamMapId: surveyTeamMap.id,
      orgId,
    });

    // Send the flow
    await sendFlow({
      orgId,
      dbFlowId: flowId,
      phone: userPhone,
    });
  } catch (error) {
    log.error(`Error handling flow node: ${error.message}`);
    throw error; // Let the caller handle this
  }
}

/**
 * Handle initial interaction with a user when no specific automation matches
 * @param orgId Organization ID
 * @param phone User's phone number
 * @param message User's message content
 */
async function handleInitialInteraction(
  orgId: string,
  phone: string,
  message: string,
) {
  try {
    // Look for a wildcard automation command
    const wildcardAutomation = await prisma.waAutomatedReplyCommands.findUnique(
      {
        where: {
          command_org_id_unique: {
            command: "*",
            orgId: orgId,
          },
        },
        include: {
          waAutomatedReply: true,
        },
      },
    );

    if (!wildcardAutomation?.waAutomatedReply) {
      log.info(`No wildcard automation found for org ${orgId}`);
      return;
    }

    const automation = wildcardAutomation.waAutomatedReply as {
      id: string;
      matchData: { json: { nodes: any[]; edges: any[] } };
    };
    const startNode = automation?.matchData?.json?.nodes?.find(
      (node: any) => node.type === "startNode",
    );

    if (!startNode) {
      log.error("No start node found in the wildcard automation flow");
      return;
    }

    // Create record of this interaction using the utility function
    const automationLog = await logAutomationAction({
      phone,
      nodeId: startNode.id,
      automationId: automation.id,
      orgId,
      response: {
        value: message,
        action: "initial_interaction",
      },
    });

    // Process the automation flow
    await processNextNode(
      phone,
      automation,
      startNode.id,
      orgId,
      automationLog?.id,
    );
  } catch (error) {
    log.error(`Error handling initial interaction: ${error.message}`);
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
  userId?: string,
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
            campaign: {
              select: {
                flowId: true,
              },
            },
            WaMessageCampaginParticipantMap: {
              take: 1,
              select: {
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
      campaign.dynamicTags,
      participantId,
      userId,
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
export function convertComponentForSenting(dbTemplate) {
  const containsImage =
    dbTemplate.data.components.find(
      (c) => c.type.toLowerCase() === WaTemplateComponentType.HEADER,
    )?.format === "IMAGE";

  const components = [];
  const addHeaderComponent = (format, link, filename = null) => {
    const newComponent = {
      type: WaTemplateComponentType.HEADER,
      parameters: [
        {
          type: format.toLowerCase(),
          [format.toLowerCase()]: {
            link,
            ...(filename && { filename }),
          },
        },
      ],
    };
    components.push(newComponent);
  };

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
  if (dbTemplate.defaultValues?.document?.link) {
    addHeaderComponent(
      WaTemplateSupportedFormats.DOCUMENT,
      getFileUrlFromKey(dbTemplate.defaultValues.document.link),
      dbTemplate.defaultValues?.document?.filename,
    );
  }

  dbTemplate.data.components.forEach((item) => {
    if (item.type?.toLowerCase() === WaTemplateComponentType.BUTTONS) {
      item?.buttons.forEach((button, idx) => {
        if (button.type === "URL" && button?.example?.length > 0) {
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
export function updateButtonText(array, newText) {
  return (
    array.map((item) => {
      if (
        item.type === "button" &&
        item.sub_type === "url" &&
        item?.parameters?.length > 0
      ) {
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
  id: string;
  team: {
    id: string;
    orgId: string;
  };
  campaignParticipants: (CampaignParticipant & {
    contact: Contact;
  })[];
  useUserConsent: boolean;
};
// TODO: use batch sending
async function _sendCampaignToParticipants(
  campaign: _campaign,
  sendToStatuses: CampaignParticipantStatus[],
  components: any,
  flowId: string,
  orgId: string,
  dbTemplate: WaTemplateWithTypes,
  contactTags: string[],
  individualParticipantId?: string,
  userId?: string,
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

  const [usage, subscription] = await Promise.all([
    getUsageStats(orgId),
    getSubscription(orgId),
  ]);

  if (!usage || !subscription) {
    let errorMessage = "Usage stats or subscription not found";
    await updateCampaign(campaign.id, {
      status: CampaignStatus.INACTIVE,
      errorMessage: errorMessage,
    });
    log.error(errorMessage, "in _sendCampaignToParticipants", orgId);
    return;
  }

  const newMessagesCount = campaign.campaignParticipants.filter(
    (participant) =>
      (individualParticipantId ||
        sendToStatuses.includes(
          getStatusData(participant) as CampaignParticipantStatus,
        )) &&
      (participant.contact.consent || !campaign.useUserConsent) &&
      participant.contact.phone,
  ).length;

  const monthlyMessageLimit =
    subscription.features?.[SubscriptionFeaturePathName.Whatsapp].count
      ?.monthlyMessageLimit ?? 0;

  const annualLimit = monthlyMessageLimit * 12;

  if (
    subscription?.isAnnualMessageLimit &&
    (usage.annualMessageCount ?? 0) + newMessagesCount > annualLimit
  ) {
    let errorMessage =
      usage.annualMessageCount >= annualLimit
        ? "You have reached the maximum annual limit of messages."
        : `Sending messages to all participants will exceed the annual limit. Please reduce the number of messages by ${
            annualLimit - usage.annualMessageCount
          } to proceed.`;
    await updateCampaign(campaign?.id, {
      status: CampaignStatus.INACTIVE,
      errorMessage: errorMessage,
    });
    log.error(errorMessage, "in _sendCampaignToParticipants", orgId);
    return;
  } else if (
    (usage.monthlyMessagesCount ?? 0) + newMessagesCount >
    monthlyMessageLimit
  ) {
    let errorMessage =
      usage.monthlyMessagesCount >= monthlyMessageLimit
        ? "You have reached the maximum monthly limit of messages."
        : `Sending messages to all participants will exceed the monthly limit. Please reduce the number of messages by ${
            monthlyMessageLimit - usage.monthlyMessagesCount
          } to proceed.`;
    await updateCampaign(campaign.id, {
      status: CampaignStatus.INACTIVE,
      errorMessage: errorMessage,
    });
    log.error(errorMessage, "in _sendCampaignToParticipants", orgId);
    return;
  }

  for (const participant of campaign.campaignParticipants) {
    const { contact, id } = participant;
    let copyComponents = [...components];
    if (
      !individualParticipantId &&
      !sendToStatuses.includes(
        getStatusData(participant) as CampaignParticipantStatus,
      )
    ) {
      log.warn("Campaign already sent to participant %o. Skipping...", contact);
      continue;
    }
    if (!contact.consent && campaign.useUserConsent) {
      log.warn("contact has no consent to sent %o. Skipping...", contact);
      continue;
    }
    if (!contact.phone) {
      log.warn("Contact %o does not have a phone number", contact);
      // TODO: handle this case. maybe send email?
      continue;
    }

    const defaultValue = dbTemplate?.data?.components?.find(
      (data) => data.example?.body_text,
    )?.example?.body_text?.[0];
    if (defaultValue?.length > 0) {
      const parameters = contactTags?.map((tag, i) => {
        const textValue =
          tag === "name"
            ? contact?.name || defaultValue[i]
            : contact.tags?.[tag] || defaultValue[i];
        return { type: "text", textValue };
      });
      copyComponents.push({
        type: "body",
        parameters,
      });
    }

    const updatedComponent = updateButtonText(copyComponents, contact.phone);

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
    sendMessage(orgId, templateMessage, null, userId)
      .then(sendCampaignCallback)
      .catch((e) => {
        log.error("Could not send campaign to %s", contact.phone);
        log.error(e);
      });
  }
}

// Temporary rate limiting
export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const getStatusData = (info) => {
  let statusData: string = (
    getLatestStatus(info?.WaMessageCampaginParticipantMap) || ""
  ).toUpperCase();
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
