// The webhook POST is accepted in wasurvey.ingress.ts and processed in
// wasurvey.webhook.ts (from the kafka service). What stays here is the webhook
// GET handshake and the automation engine those handlers — and other modules —
// call into.
import { timingSafeEqual } from "node:crypto";
import { FastifyRequest, FastifyReply } from "fastify";
import { WaParsedMessage, convertNodeToWhatsAppMessage } from "./wasurvey.utils.js";
import { sendMessage } from "./wasurvey.service.js";
import {
  CampaignParticipantStatus,
  WaTemplateComponentType,
  SubscriptionFeaturePathName,
  WaTemplateSupportedFormats,
} from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import { MetaAsset } from "../settings/wa_settings.service.js";
import {
  WaMessageBody,
  WaReceiveMessageBody,
  type OutgoingTemplateComponent,
  type WaSendMessageBody,
} from "../../../types/whatsapp.types.js";
import { WaAutomationProgressStatus } from "../../../generated/prisma/enums.js";
import prisma from "../../../utils/prisma.js";
import { getFlowWithSurveyTeamMapIdsWithDbFlowId, sendFlow } from "../flows/flow.service.js";
import { checkAndExecuteRuleByTriggerEvent } from "../automatedReply/wa_automatedReply.utils.js";
import { CampaignParticipant, Contact, PlatformType } from "../../../generated/prisma/client.js";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload.js";
import { getOrCreateContactByPhone } from "../../contact/contact.service.js";
import { updateMonthlyStat } from "../../stats/stats.service.js";
import { getLatestStatus } from "../../campaign/campaign.service.js";
import { sendTemplateToUserCore } from "../messageTemplates/wa_templates.controller.js";
import { NodeTypeMap, TypedNode } from "./node-types.js";
import type {
  AutomationGraph,
  AutomationWithGraph,
  TemplateComponent,
  TemplateComponentParameter,
} from "./node-types.js";
import { logAutomationAction, findRecentAutomation } from "./automation-logger.utils.js";
import { moveAutomationPosition } from "./automationProgress.js";
import {
  getAutomatedReplyById,
  verifyAutomationTriggerLimit,
} from "../automatedReply/wa_automatedReply.service.js";
import { runAssignNode } from "../automatedReply/assignNode.service.js";
import { createCustomerAccount } from "../../loyalty/accounts/account.service.js";
import { getLoyaltyProgramByOrg } from "../../loyalty/program/program.service.js";
import { LoyaltyChannel } from "../../loyalty/messaging/channelIds.js";
import { replySystem, type InboundReplyContext } from "../../loyalty/messaging/reply.js";
import { pausedAutomationQueue } from "../../../workers/bullmq/queues/index.js";
import { contactWhereIdentity } from "../../contact/identity/contactFields.js";

// TODO: add as fastify schema
interface subscribeQuery {
  "hub.mode": string;
  "hub.verify_token": string;
  "hub.challenge": string;
}
export function isVerifyTokenValid(
  given: unknown,
  expected: string | undefined = process.env.wa_webhook_password,
): boolean {
  if (!expected || typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function webhookSubscribeHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const query = request.query as subscribeQuery;
    // An unset password must refuse: `undefined === undefined` used to let a request
    // with no token at all complete the handshake.
    if (query["hub.mode"] === "subscribe" && isVerifyTokenValid(query["hub.verify_token"])) {
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

export async function handleWaJoinRegistration({
  orgId,
  from,
  userName,
  joinPayload,
  sourceIdentifier,
  reply = { orgId, channel: LoyaltyChannel.WHATSAPP, from, name: userName },
}: {
  orgId: string;
  from: string;
  userName?: string;
  joinPayload: { source?: string; referralCode?: string };
  sourceIdentifier: string | undefined;
  reply?: InboundReplyContext;
}) {
  const program = await getLoyaltyProgramByOrg(orgId);
  if (program?.status !== "active") {
    log.error(
      "Loyalty program not found or inactive for orgId: %s, status: %s",
      orgId,
      program?.status,
    );
    await replySystem(reply, "programUnavailable");
    return;
  }
  // 1. Check if already registered
  const existingCustomer = await prisma.customerLoyaltyAccount.findFirst({
    where: {
      contact: { orgId, ...contactWhereIdentity("phone", from) },
      programId: program.id,
      status: "active",
    },
  });

  if (existingCustomer) {
    await replySystem(reply, "alreadyRegistered");
    return;
  }
  // 2. Create or update customer
  await createCustomerAccount(
    {
      phone: from,
      name: userName ?? "",
      referCode: joinPayload.referralCode,
      source: joinPayload.source || "WHATSAPP",
      orgId: orgId,
    },
    program.id,
    orgId,
    sourceIdentifier,
    { reply },
  );
}

async function handleInputReply({
  phone,
  orgId,
  parsedMessage,
}: {
  phone: string;
  orgId: string;
  parsedMessage: WaParsedMessage;
}) {
  // Find the most recent automation progress for this phone/org in the last 4 hours
  const progress = await findRecentAutomation(phone, orgId, {
    timeWindow: 4 * 60 * 60 * 1000, // 4 hours
  });
  const automation = progress?.waAutomatedReply;
  if (automation) {
    const matchData = automation.matchData as {
      json: AutomationGraph;
    };
    const nextEdge = matchData?.json?.edges?.find((edge) => edge.target === progress.currentNode);

    if (!nextEdge) return false;

    const nextNode = matchData?.json?.nodes?.find((node) => node.id === nextEdge.source);

    if (!nextNode) return false;

    if (nextNode.type === "textInputNode") {
      // Log flow submission using the utility function

      logAutomationAction({
        phone,
        nodeId: nextNode.id,
        automationId: automation.id,
        orgId,
        response: {
          value: parsedMessage?.message,
          variable: String(nextNode?.data?.variableName ?? ""),
          action: "user_input",
        },
      });

      await processNextNode(phone, automation, progress.currentNode ?? "", orgId, automation.id);
      return true;
    }
  }
  return false;
}
/**
 * Handles automated replies for WhatsApp messages
 * @param orgId Organization ID
 * @param waMessage WhatsApp message body
 * @param parsedMessage Parsed message data
 * @param phone User's phone number
 * @param message Original message text
 * @param automatedReplyId Optional ID of the automated reply to use
 */
export async function handleAutomatedReply(
  orgId: string,
  // Manual triggers (see initiateAutomatedReplyByIdHandler) have no real incoming
  // WhatsApp webhook payload to supply, so these are nullable for that caller. The
  // else-branch below (real webhook-driven messages) guards and narrows them back to
  // non-null before using them.
  waMessage: WaMessageBody | null,
  parsedMessage: WaParsedMessage | null,
  phone: string,
  message: string | null,
  automatedReplyId?: string,
) {
  if (!automatedReplyId) {
    // already handled on case manual trigger
    if (
      !(await verifyAutomationTriggerLimit(orgId, {
        platform: PlatformType.WHATSAPP,
        customerId: phone,
      }))
    )
      return;
  }

  const phoneNumberId = (waMessage?.entry?.[0]?.changes?.[0]?.value as WaReceiveMessageBody)
    ?.metadata?.phone_number_id;

  try {
    if (automatedReplyId) {
      const automation = await getAutomatedReplyById(automatedReplyId, orgId);
      if (automation) {
        if (phoneNumberId) {
          automation.whatsappSettingsPhoneId = phoneNumberId;
        }
        await startAutomationFlow(phone, automation, parsedMessage, orgId);
        await updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
      }
    } else {
      if (!waMessage || !parsedMessage) {
        throw new Error(
          "waMessage and parsedMessage are required when no automatedReplyId is provided",
        );
      }
      // A sticker, reaction or uncaptioned photo has no text for an automation to match.
      // These were never answered; they just used to throw and log an error each time.
      if (!message) return;
      const inputHandled = await handleInputReply({
        phone,
        orgId,
        parsedMessage,
      });
      if (inputHandled) return;
      // Check rule-based automation first
      const ruleResult = await checkAndExecuteRuleByTriggerEvent("MESSAGE_RECEIVED", {
        orgId,
        phoneNumberId,
        message,
        phone,
        waMessage,
        buttonPayload: parsedMessage?.buttonPayload,
        platform: "WHATSAPP",
      });

      if (ruleResult) {
        log.trace("Rule matched and actions executed: %o", ruleResult);
        return;
      }
      await updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
    }
  } catch (error) {
    log.error({ err: error }, "Error handling automated reply");
  }
}

export async function handleButtonClickInteraction(
  phone: string,
  parsedMessage: WaParsedMessage,
  orgId: string,
) {
  // Use the utility function instead of duplicating the query
  const recentInteraction = await findRecentAutomation(phone, orgId, {
    timeWindow: 24 * 60 * 60 * 1000, // 24 hours
  });

  const automation = recentInteraction?.waAutomatedReply as {
    id: string;
    matchData: { json: AutomationGraph };
    whatsappSettingsPhoneId: string;
  };
  if (!automation || !recentInteraction) {
    log.warn(`No active automation found for button click from ${phone}`);
    return;
  }

  // Log button click action using the utility function
  const automationLog = await logAutomationAction({
    phone,
    nodeId: recentInteraction.currentNode ?? "",
    automationId: automation.id,
    orgId,
    response: {
      value: parsedMessage?.message,
      buttonId: parsedMessage.buttonId,
      action: "button_click",
    },
  });

  // Find the next nodes based on the button clicked
  const nextNodes = automation?.matchData?.json?.edges.filter(
    (edge) => edge.sourceHandle === parsedMessage.buttonId,
  );
  if (nextNodes.length) {
    for (const node of nextNodes) {
      if (node?.target) {
        await processNextNode(phone, automation, node.target, orgId, automationLog?.id);
      }
    }
  } else {
    log.warn(`No next node found for buttonId ${parsedMessage.buttonId}`);
  }
}
/**
 * Starts an automation flow from the beginning (start node)
 * @param phone User's phone number
 * @param automation The automation flow data
 * @param parsedMessage Parsed message data from WhatsApp
 * @param orgId Organization ID
 * @returns Promise that resolves when the automation has started
 */
async function startAutomationFlow(
  phone: string,
  automation: AutomationWithGraph,
  parsedMessage: WaParsedMessage | null,
  orgId: string,
) {
  const startNode = automation?.matchData?.json?.nodes?.find((node) => node.type === "startNode");

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

  await processNextNode(phone, automation, startNode.id, orgId, automationLog?.id);
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
  automation: AutomationWithGraph,
  nodeId: string,
  orgId: string,
  automationMessageId: string | undefined,
  lead?: MetaAsset["leads"][0],
) {
  try {
    if (!nodeId || !automation?.matchData?.json?.nodes) {
      log.error("Invalid node ID or automation data");
      return;
    }

    // Find the current node. The stored node carries the union of every node
    // kind's data; the switch below discriminates on `type`.
    const node = automation.matchData?.json?.nodes.find((n) => n.id === nodeId) as
      | (TypedNode & {
          data: {
            template?: { id: string; name: string };
            flow?: { id: string; name: string };
            parameters?: TemplateComponent[];
            teamId?: string;
          };
        })
      | undefined;
    if (!node) {
      log.error("Automation %s has no node %s", automation.id, nodeId);
      return;
    }

    if (!node) {
      log.error(`Node with ID ${nodeId} not found in automation flow`);
      return;
    }

    // Skip processing for special nodes
    if (["endNode", "startNode", "leadgenNode"].includes(node?.type)) {
      // For start node, just move to the next node
      const nextEdges = automation.matchData?.json?.edges.filter((edge) => edge.source === nodeId);

      if (nextEdges) {
        for (const nextEdge of nextEdges) {
          await prisma.waAutomatedReplyMessage.updateMany({
            where: { phone: userPhone, waAutomatedReplyId: automation.id },
            data: { currentNode: nextEdge.target },
          });
          await moveAutomationPosition(orgId, userPhone, automation.id, nextEdge.target);
          await processNextNode(
            userPhone,
            automation,
            nextEdge.target,
            orgId,
            automationMessageId,
            lead,
          );
        }
      }

      return;
    }

    // Process different node types
    switch (node.type) {
      case "flowNode":
        await handleFlowNode(
          node,
          userPhone,
          orgId,
          automation?.whatsappSettingsPhoneId ?? undefined,
        );
        break;

      case "templateNode":
        let parameters = node?.data?.parameters;
        if (lead) {
          parameters = node?.data?.parameters?.map((param) => {
            if (param.type === "body") {
              const newParams = param?.parameters?.map((p: TemplateComponentParameter) => {
                if (
                  p?.text &&
                  typeof p.text !== "string" &&
                  p.text.type === "leadgenform-question-key"
                ) {
                  const fieldName = p.text.value;
                  p.text =
                    lead.field_data.find((field) => field.name === fieldName)?.values[0] ?? null;
                }
                return p;
              });
              param.parameters = [...newParams];
            }
            return param;
          });
        }
        if (!node?.data?.template?.id) {
          log.error("templateNode has no associated template id");
          break;
        }
        await sendTemplateToUserCore(
          orgId,
          node.data.template.id,
          userPhone,
          parameters ?? [],
          node?.data?.teamId,
          undefined,
          undefined,
          undefined,
          undefined,
        );
        break;
      case "pauseNode": {
        if (!automationMessageId) {
          log.error("Cannot pause automation without an automationMessageId");
          break;
        }
        const pauseData = node.data as NodeTypeMap["pauseNode"];
        let ms = 0;
        const duration = pauseData.duration || 0;
        const unit = pauseData.unit || "seconds";

        if (unit === "seconds") ms = duration * 1000;
        else if (unit === "minutes") ms = duration * 60 * 1000;
        else if (unit === "hours") ms = duration * 60 * 60 * 1000;

        // Add delayed job to BullMQ
        const job = await pausedAutomationQueue.add(
          "resume-automation",
          {
            automationMessageId,
            phone: userPhone,
            orgId,
            currentNode: nodeId,
            automationId: automation.id,
          },
          {
            delay: ms,
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
          },
        );

        // Update database with paused status and job ID
        await prisma.waAutomatedReplyMessage.update({
          where: { id: automationMessageId },
          data: {
            status: WaAutomationProgressStatus.paused,
          },
        });

        log.info(
          `Paused automation ${automationMessageId} for ${duration} ${unit}, job ID: ${job.id}`,
        );
        return;
      }

      case "assignNode": {
        const assignData = node?.data as NodeTypeMap["assignNode"];
        const contactResult = await getOrCreateContactByPhone(
          userPhone,
          orgId,
          undefined,
          undefined,
          true,
        );
        if (!contactResult) {
          log.error("Could not get or create contact for assignNode, phone: %s", userPhone);
          break;
        }
        const { contact } = contactResult;
        const outcome = await runAssignNode(assignData, contact.id, orgId, automation?.id);
        if (outcome === "alreadyAssigned") return;
        break;
      }
      default:
        // For text, buttons, and other message types
        const waMessage = await convertNodeToWhatsAppMessage(node, userPhone);
        // convertNodeToWhatsAppMessage returns null for node kinds that send
        // nothing themselves (e.g. pause/assign). WhatsAppMessage is the
        // builder's own loose shape; sendMessage takes the concrete send bodies.
        if (!waMessage) break;
        await sendMessage(
          orgId,
          waMessage as unknown as WaSendMessageBody,
          undefined,
          undefined,
          automation?.whatsappSettingsPhoneId ?? undefined,
        );
        break;
    }

    // Find and process next node unless current node requires user input
    const requiresUserInput = ["buttonNode", "flowNode", "listNode", "textInputNode"].includes(
      node?.type,
    );
    const nextEdges = automation.matchData?.json?.edges.filter((edge) => edge.source === nodeId);

    if (nextEdges) {
      for (const nextEdge of nextEdges) {
        await prisma.waAutomatedReplyMessage.updateMany({
          where: { phone: userPhone, waAutomatedReplyId: automation.id },
          data: { currentNode: nextEdge.target },
        });
        await moveAutomationPosition(orgId, userPhone, automation.id, nextEdge.target);
        if (!requiresUserInput) {
          await processNextNode(
            userPhone,
            automation,
            nextEdge.target,
            orgId,
            automationMessageId,
            lead,
          );
        }
      }
    } else {
      // No next node, mark as completed
      await prisma.waAutomatedReplyMessage.updateMany({
        where: { phone: userPhone, waAutomatedReplyId: automation.id },
        data: { status: "completed" },
      });
    }
  } catch (error) {
    log.error({ err: error }, `Error processing node ${nodeId}`);
  }
}

/**
 * Handle processing of a flow node
 * @param node Flow node to process
 * @param userPhone User's phone number
 * @param orgId Organization ID
 * @param whatsappSettingsPhoneId WhatsApp settings phone ID
 */
async function handleFlowNode(
  node: TypedNode & { data: { flow?: { id: string; name: string }; teamId?: string } },
  userPhone: string,
  orgId: string,
  whatsappSettingsPhoneId?: string,
) {
  try {
    const flowId = node?.data?.flow?.id;
    const teamId = node?.data?.teamId;

    if (!flowId) {
      throw new Error("Flow ID not found in node data");
    }

    // Get flow data
    const dbFlow = await getFlowWithSurveyTeamMapIdsWithDbFlowId(flowId, orgId);

    if (!dbFlow) {
      throw new Error(`Flow with ID ${flowId} not found`);
    }

    // Find survey team map
    const surveyTeamMap = dbFlow?.survey?.teams?.find((team) => team?.teamId === teamId);

    if (!surveyTeamMap) {
      throw new Error(`No survey team map found for team ID ${teamId}`);
    }

    // Send the flow
    await sendFlow({
      orgId,
      dbFlowId: flowId,
      phone: userPhone,
      whatsappSettingsPhoneId,
      context: { surveyTeamMapId: surveyTeamMap.id },
    });
  } catch (error) {
    log.error({ err: error }, "Error handling flow node");
    throw error; // Let the caller handle this
  }
}

// `sendCampaignToParticipants` and its `_sendCampaignToParticipants` worker
// loop lived here: an in-process `for` over every participant with a
// `await wait(50)` and a `// TODO: add rate limiting`. It was the second of two
// live send paths, overlapping with the BullMQ fan-out the send dialog already
// used, and only avoided double-sending by accident — every live write of
// `scheduledStatuses` is `[]`, so the loop skipped every participant.
//
// Scheduled campaigns now go through `enqueueCampaignMessage` like every other
// send, so each one is a CampaignSend row with its own counters and its own
// retry schedule. See `sendCampaign` in `campaign/campaign.service.ts`.
export function convertComponentForSenting(dbTemplate: WaTemplateWithTypes) {
  const containsImage =
    dbTemplate.data.components.find((c) => c.type.toLowerCase() === WaTemplateComponentType.HEADER)
      ?.format === "IMAGE";

  const components: OutgoingTemplateComponent[] = [];
  const addHeaderComponent = (format: string, link: string, filename: string | null = null) => {
    // The media key is the lowercased format ("image"/"video"/"document"),
    // which is why the parameter shape is keyed dynamically.
    const newComponent: OutgoingTemplateComponent = {
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
      throw new Error("Image not found in template. Please delete & create a new template.");
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
      item?.buttons?.forEach((button, idx: number) => {
        if (button.type === "URL" && (button.example?.length ?? 0) > 0) {
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
export function updateButtonText(array: OutgoingTemplateComponent[], newText: string) {
  return (
    array.map((item) => {
      if (item.type === "button" && item.sub_type === "url" && (item.parameters?.length ?? 0) > 0) {
        return {
          ...item,
          parameters: item.parameters?.map((param) => {
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
interface _campaign {
  id: string;
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
  useUserConsent: boolean;
}
// TODO: use batch sending

// Temporary rate limiting
export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolves the status to show for a campaign participant: the latest delivery
 * status where there is one, otherwise the participant's own status.
 */
const getStatusData = (info: {
  status?: string | null;
  errorMessage?: string | null;
  campaign?: { flowId?: string | null } | null;
  WaMessageCampaginParticipantMap?: Parameters<typeof getLatestStatus>[0];
}) => {
  let statusData: string = (
    getLatestStatus(info?.WaMessageCampaginParticipantMap) || ""
  ).toUpperCase();
  const FlowId = info?.campaign?.flowId;
  const participantStatus = info.status?.toUpperCase();
  const errorMessage = info.errorMessage;
  if (FlowId && participantStatus === CampaignParticipantStatus.COMPLETED) {
    statusData = CampaignParticipantStatus.COMPLETED;
  } else if (!statusData || errorMessage) {
    // The participant may carry no status of its own; the caller treats an
    // empty string as "unknown" (this was previously an undefined assignment).
    statusData = participantStatus ?? "";
  }
  return statusData;
};
