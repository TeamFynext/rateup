import {
  PlatformType,
  Prisma,
  ResponsePlatform,
  WhatsappSettings,
} from "../../../../generated/prisma/client.js";
import {
  CampaignParticipantStatus,
  QuestionType as Q,
  SubscriptionFeaturePathName,
  WaQuestions,
  WaTemplateCategory,
} from "../../../types/enums.js";
import {
  LeadGenBody,
  LeadGenFieldData,
  WaMessageBody,
  WaSendMessageBody,
  WaStatusPricing,
} from "../../../types/whatsapp.types.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import {
  incrementInboxStat,
  decrementInboxStat,
  mapStatusToField,
} from "../inbox/inboxStats/inboxStats.service.js";
import {
  updateCampaignParticipant,
  updateDripCampaignParticipant,
} from "../../campaign/campaignParticipants/campaignParticipants.service.js";
import { getOrCreateContactByPhone } from "../../contact/contact.service.js";
import { getQuestionsBySurveyId } from "../../question/question.service.js";
import { CreateResponseInput } from "../../response/response.schema.js";
import {
  createResponse,
  saveResponseToGoogleSheet,
  sendResponseToWebhook,
  updateResponse,
} from "../../response/response.service.js";
import { updateCompletedSurvey } from "../../survey/survey.service.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import {
  getWaSettings,
  getWaSettingsByIbaId,
  getWaSettingsByPageId,
} from "../settings/wa_settings.service.js";
import { GraphApiError, callMetaApi } from "../wa_axios.js";
import { graphApiErrorDetail } from "../../../utils/graphError.js";

import { createTextMessage } from "./wasurvey.utils.js";
import { getGraphApiErrorMessage } from "../wa_error_handler.js";
import { uploadFile } from "../../../utils/upload/s3Upload.js";
import axios from "axios";

import { findRecentAutomation, logAutomationAction } from "./automation-logger.utils.js";
import { processNextNode } from "./wasurvey.controller.js";
import { LeadgenNodeData } from "./node-types.js";
import { hasFeature } from "../../subscription/subscription.service.js";
import {
  addZapierTriggerToQueue,
  ZapierTriggers,
} from "../../integrations/external/zapier/zapier.service.js";
import { producer } from "../../../plugins/kafka.js";
import { assertWithinConversationLimit } from "./wasurvey.auth.js";
import type { sendPaymentInitTemplate } from "../automatedReply/wa_automatedReply.utils.js";

export async function sendMessage(
  orgId: string,
  // sendPaymentInitTemplate()'s payment order-details message has a shape
  // WaSendMessageBody doesn't model (see wa_message_scheduler.ts) but is a valid
  // outbound payload here too.
  messageData:
    | WaSendMessageBody
    | IgSendMessageBody
    | FbSendMessageBody
    | Awaited<ReturnType<typeof sendPaymentInitTemplate>>,
  userName?: string,
  userId?: string,
  whatsappSettingsPhoneId?: string,
  platform: PlatformType = PlatformType.WHATSAPP,
  category?: WaTemplateCategory,
  teamId: string | null = null,
  messageType: "INBOX" | "TEMPLATE" | "CAMPAIGN" | "AUTOMATED" | "FLOW" = "INBOX",
  isAutomated?: boolean,
  externalApi?: boolean,
  // System/transactional sends (OTP, payment, ticket notifications) pass true to
  // bypass the conversation limit. All normal business outbound is gated.
  skipConversationLimit = false,
) {
  // Freeze all outbound (WhatsApp/Instagram/Facebook/Webchat) once the org is over
  // its conversation limit. Inbound is never gated — this is the outbound path only.
  if (!skipConversationLimit) {
    await assertWithinConversationLimit(orgId);
  }
  let waSettings: Omit<WhatsappSettings, "accessToken_iv"> | null = null;
  let to: string;
  let configId: string | undefined;
  let accessToken: string | undefined;
  let sourceIdentifier: string | undefined;
  if (platform === PlatformType.INSTAGRAM) {
    if (!whatsappSettingsPhoneId) {
      throw new Error("whatsappSettingsPhoneId is required for Instagram messages");
    }
    waSettings = await getWaSettingsByIbaId(whatsappSettingsPhoneId);
    if (!waSettings) {
      throw new Error(`Instagram account is not configured for id: ${whatsappSettingsPhoneId}`);
    }
    to = (messageData as IgSendMessageBody).recipient.id;
    configId = "me";
    accessToken = waSettings.pageAccessToken ?? undefined;
    sourceIdentifier = waSettings.ibaId ?? undefined;
  } else if (platform === PlatformType.FACEBOOK) {
    if (!whatsappSettingsPhoneId) {
      throw new Error("whatsappSettingsPhoneId is required for Facebook messages");
    }
    waSettings = await getWaSettingsByPageId(whatsappSettingsPhoneId);
    if (!waSettings) {
      throw new Error(`Facebook page is not configured for page ID: ${whatsappSettingsPhoneId}`);
    }
    to = (messageData as FbSendMessageBody).recipient.id;
    configId = "me";
    accessToken = waSettings.pageAccessToken ?? undefined;
    sourceIdentifier = waSettings.fbPageId ?? undefined;
  } else if (platform !== PlatformType.WEBCHAT) {
    waSettings = await getWaSettings(orgId, whatsappSettingsPhoneId);
    if (!waSettings) {
      throw new Error(`WhatsApp settings not found for org: ${orgId}`);
    }
    to = (messageData as WaSendMessageBody).to;
    configId = waSettings.phoneId ?? undefined;
    accessToken = waSettings.accessToken;
    sourceIdentifier = waSettings.phone ?? undefined;
  } else {
    to = (messageData as WaSendMessageBody).to;
  }
  let messageUrl = "messages";
  if (category === WaTemplateCategory.MARKETING) {
    messageUrl = "marketing_messages";
  }

  log.trace(`sending message to %s \n%o`, to, messageData);
  try {
    let res;
    if (platform !== PlatformType.WEBCHAT) {
      res = await callMetaApi(
        `/${configId}/${messageUrl}`,
        "POST",
        platform === PlatformType.INSTAGRAM ? undefined : accessToken,
        messageData,
        platform === PlatformType.INSTAGRAM ? { params: { access_token: accessToken } } : {},
      );
      log.trace(`sent successfully %o %o `, res.data, res.statusText);
    }
    let messageId;
    if (platform === PlatformType.INSTAGRAM || platform === PlatformType.FACEBOOK) {
      messageId = res?.data?.message_id;
    } else if (platform === PlatformType.WEBCHAT) {
      const phone = (messageData as WaSendMessageBody).to.replace(/\D/g, "");
      messageId = `webid.chat${phone}FQIAERgS${Buffer.from(phone).toString("base64").slice(0, 22)}AA==`;
    } else {
      messageId = res?.data?.messages?.[0]?.id;
    }
    await handleWaMessages(
      "send",
      messageData,
      to,
      orgId,
      platform,
      sourceIdentifier,
      userName,
      messageId,
      userId,
      false,
      teamId ?? null,
      messageType,
      isAutomated,
      externalApi,
    );
    return { status: true, message: messageId };
  } catch (e) {
    log.error({ error: e }, "Error sending message");
    let errorMessage = `Failed to send message`;
    if (e instanceof GraphApiError) {
      errorMessage = getGraphApiErrorMessage(e);
    }

    await handleWaMessages(
      "send",
      messageData,
      to,
      orgId,
      platform,
      sourceIdentifier,
      userName,
      undefined,
      userId,
      true,
      teamId ?? null,
      messageType,
      isAutomated,
      externalApi,
      graphApiErrorDetail(e),
    );
    return {
      status: false,
      message: errorMessage,
    };
  }
}

function createBlockWhatsappUserBody(phoneNumbersList: string[]) {
  const listBody = phoneNumbersList.map((phone) => ({ user: phone }));
  return {
    messaging_product: "whatsapp",
    block_users: listBody,
  };
}

export async function blockWhatsappUser(orgId: string, phoneNumbers: string[]) {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) throw new Error(`WhatsApp settings not found for org: ${orgId}`);
  const body = createBlockWhatsappUserBody(phoneNumbers);
  try {
    const res = await callMetaApi(
      `/${waSettings.phoneId}/block_users`,
      "POST",
      waSettings.accessToken,
      body,
    );
    if (res.status === 200) {
      log.trace(`blocked users successfully %o %o`, res.data, res.statusText);
      const contactsToBlock = await prisma.contact.findMany({
        where: {
          phone: { in: phoneNumbers },
          orgId,
          blockedOnWhatsApp: false,
          lastReceivedMessageTimeStamp: { not: null },
        },
        select: { waMessageAssignStatus: true },
      });

      await prisma.contact.updateMany({
        where: {
          phone: {
            in: phoneNumbers,
          },
          orgId,
        },
        data: {
          blockedOnWhatsApp: true,
        },
      });

      for (const contact of contactsToBlock) {
        const statusField = mapStatusToField(contact.waMessageAssignStatus);
        if (statusField) await decrementInboxStat(orgId, statusField, 1);
      }
      if (contactsToBlock.length > 0) {
        await incrementInboxStat(orgId, "blockedCount", contactsToBlock.length);
      }
      return { success: true };
    }
    if (res.status === 400 && res.data?.error?.code === 139100) {
      log.error("Failed to block some users: see error %o", res.data);
      const blockedNumbers = res.data?.blocked_users?.added_users?.map(
        (user: { input?: string }) => user?.input,
      );
      const failedNumbers = res.data?.blocked_users?.failed_users?.map(
        (user: { input?: string }) => user?.input,
      );
      log.trace(`blocked users successfully %o %o`, res.data, res.statusText);
      const contactsToBlock = await prisma.contact.findMany({
        where: {
          phone: { in: blockedNumbers },
          orgId,
          blockedOnWhatsApp: false,
          lastReceivedMessageTimeStamp: { not: null },
        },
        select: { waMessageAssignStatus: true },
      });

      await prisma.contact.updateMany({
        where: {
          phone: {
            in: blockedNumbers,
          },
          orgId,
        },
        data: {
          blockedOnWhatsApp: true,
        },
      });

      for (const contact of contactsToBlock) {
        const statusField = mapStatusToField(contact.waMessageAssignStatus);
        if (statusField) await decrementInboxStat(orgId, statusField, 1);
      }
      if (contactsToBlock.length > 0) {
        await incrementInboxStat(orgId, "blockedCount", contactsToBlock.length);
      }
      return {
        success: false,
        failedNumbers,
      };
    }
    return { success: false };
  } catch (e) {
    console.error(e);
    log.error({ error: e }, "Error blocking WhatsApp user");
    return { success: false, error: e };
  }
}

export async function unblockWhatsappUser(orgId: string, phoneNumbers: string[]) {
  const waSettings = await getWaSettings(orgId);
  if (!waSettings) throw new Error(`WhatsApp settings not found for org: ${orgId}`);
  const body = createBlockWhatsappUserBody(phoneNumbers);
  try {
    const res = await callMetaApi(
      `/${waSettings.phoneId}/block_users`,
      "DELETE",
      waSettings.accessToken,
      body,
    );
    if (res.status === 200) {
      log.trace(`blocked users successfully %o %o`, res.data, res.statusText);
      const contactsToUnblock = await prisma.contact.findMany({
        where: {
          phone: { in: phoneNumbers },
          orgId,
          blockedOnWhatsApp: true,
          lastReceivedMessageTimeStamp: { not: null },
        },
        select: { waMessageAssignStatus: true },
      });

      await prisma.contact.updateMany({
        where: {
          phone: {
            in: phoneNumbers,
          },
          orgId,
        },
        data: {
          blockedOnWhatsApp: false,
        },
      });

      for (const contact of contactsToUnblock) {
        const statusField = mapStatusToField(contact.waMessageAssignStatus);
        if (statusField) await incrementInboxStat(orgId, statusField, 1);
      }
      if (contactsToUnblock.length > 0) {
        await decrementInboxStat(orgId, "blockedCount", contactsToUnblock.length);
      }
      return { success: true };
    }
    if (res.status === 400 && res.data?.error?.code === 139100) {
      log.error("Failed to block some users: see error %o", res.data);
      const unblockedNumbers = res.data?.blocked_users?.added_users?.map(
        (user: { input?: string }) => user?.input,
      );
      const failedNumbers = res.data?.blocked_users?.failed_users?.map(
        (user: { input?: string }) => user?.input,
      );
      log.trace(`blocked users successfully %o %o`, res.data, res.statusText);
      const contactsToUnblock = await prisma.contact.findMany({
        where: {
          phone: { in: unblockedNumbers },
          orgId,
          blockedOnWhatsApp: true,
          lastReceivedMessageTimeStamp: { not: null },
        },
        select: { waMessageAssignStatus: true },
      });

      await prisma.contact.updateMany({
        where: {
          phone: {
            in: unblockedNumbers,
          },
          orgId,
        },
        data: {
          blockedOnWhatsApp: false,
        },
      });

      for (const contact of contactsToUnblock) {
        const statusField = mapStatusToField(contact.waMessageAssignStatus);
        if (statusField) await incrementInboxStat(orgId, statusField, 1);
      }
      if (contactsToUnblock.length > 0) {
        await decrementInboxStat(orgId, "blockedCount", contactsToUnblock.length);
      }
      return {
        success: false,
        failedNumbers,
      };
    }
    return { success: false };
  } catch (e) {
    console.error(e);
    log.error(e);
    return { success: false, error: e };
  }
}

export async function getFirstQuestionId(surveyId: string) {
  const questions = await getQuestionsBySurveyId(surveyId);
  return questions[0].id;
}

const googleReviewSupportedTypes = [Q.Rating, Q.Smiley, Q.Opinion];
const googleReviewSupportedMetaTypes: WaQuestions[] = [
  WaQuestions.Rating,
  WaQuestions.Smiley,
  WaQuestions.Opinion,
];

interface ShouldShowGoogleReviewProps {
  questions: Question[];
  responses: QuestionResponse[];
}
export function shouldShowGoogleReview({ questions, responses }: ShouldShowGoogleReviewProps) {
  let showGoogleReview = false;
  questions.forEach((q: Question) => {
    if (googleReviewSupportedTypes.includes(q.type) && q.googleReview) {
      const questionResponse = responses.find((r) => r.questionId === q.id);
      if (!questionResponse) return;
      const value = String(
        (questionResponse.response as Record<string, unknown>)[questionResponse.type] ?? "",
      );
      switch (q.type) {
        case Q.Rating:
          if (Number.parseInt(value) >= (q.googleReview.minRating ?? Infinity)) {
            showGoogleReview = true;
          }
          break;
        case Q.Smiley:
          if ((q.googleReview.reqOptions ?? []).includes(value)) {
            showGoogleReview = true;
          }
          break;
        case Q.Opinion:
          if (Number.parseInt(value) >= (q.googleReview.minOpinion ?? Infinity)) {
            showGoogleReview = true;
          }
          break;
      }
    }
  });
  return showGoogleReview;
}
export function shouldShowGoogleReviewV2({
  screens,
  responses,
}: {
  screens: WaFlowScreen[];
  // v2 flow answers carry no QuestionType — this reads `questionId`/`response`
  // only, so it accepts either shape.
  responses: WaFlowQuestionResponse[];
}) {
  // WaFlowScreen.layout.children is declared as WaFlowForm[], but at runtime these are
  // WaFlowFormElement-shaped (id/metaType) — the same gap as elsewhere in this file.
  const questions = screens.flatMap((screen) =>
    screen.layout.children.filter(
      (child) =>
        child.metaType !== undefined && googleReviewSupportedMetaTypes.includes(child.metaType),
    ),
  );
  let showGoogleReview = false;
  questions.forEach((q) => {
    if (q.googleReview) {
      const questionResponse = responses.find((r) => r.questionId === q.id);
      if (!questionResponse) return;
      const value = String(questionResponse.response ?? "");
      switch (q.metaType) {
        case WaQuestions.Rating:
          if (Number.parseInt(value) >= (q.googleReview.minRating ?? Infinity)) {
            showGoogleReview = true;
          }
          break;
        case WaQuestions.Smiley:
          if ((q.googleReview.reqOptions ?? []).includes(value)) {
            showGoogleReview = true;
          }
          break;
        case WaQuestions.Opinion:
          if (Number.parseInt(value) >= (q.googleReview.minOpinion ?? Infinity)) {
            showGoogleReview = true;
          }
          break;
      }
    }
  });
  return showGoogleReview;
}
/**
 * Everything `saveResponses` reads about the run it is persisting. Structural,
 * not tied to any one carrier of the run context: the flow paths assemble it
 * from a signed flow_token plus the Redis answer accumulator.
 */
export interface SaveResponsesContext {
  /** Correlation id for the log line only. */
  id?: string;
  phone: string;
  orgId: string;
  responses: unknown[];
  surveyTeamMapId: string | null;
  language: string;
  tag?: string | null;
  ip?: string | null;
  campaignParticipantId?: string | null;
  campaignParticipantDripStageId?: string | null;
  /**
   * Makes the save idempotent — see SurveyResponse.idempotencyKey. Flow runs
   * pass their flow token so a retried webhook cannot file the answers twice.
   */
  idempotencyKey?: string | null;
  surveyTeamMap?: {
    survey: {
      WaFlow?: {
        anonymous?: boolean | null;
      } | null;
    };
  } | null;
}

/**
 * Saves responses to the database in SurveyResponse table.
 * To be called after getting response to the last question.
 *
 * -> updates completedSurvey count
 */
/**
 * The side effects that follow a saved response. Split out of `saveResponses` so
 * the caller can return as soon as the row exists — see the comment there.
 */
async function publishSavedResponse(
  res: Awaited<ReturnType<typeof createResponse>>,
  session: SaveResponsesContext,
  anonymous: boolean,
) {
  const { surveyTeamMapId, responses, language, createdAt, Contact, tag } = res;
  await saveResponseToGoogleSheet({
    surveyTeamMapId,
    responses,
    language,
    createdAt,
    respondent: !anonymous && Contact?.phone,
    tag,
  });
  await sendResponseToWebhook(res, session.orgId);
  if (session.surveyTeamMapId) {
    await updateCompletedSurvey(session.surveyTeamMapId);
  }
  if (session.campaignParticipantId) {
    if (session.campaignParticipantDripStageId) {
      await updateDripCampaignParticipant(session.campaignParticipantDripStageId, {
        status: CampaignParticipantStatus.COMPLETED,
        // responseId: res.id,
      });
      await updateDripCampaignStats(session.campaignParticipantDripStageId);
    } else {
      await updateCampaignParticipant(session.campaignParticipantId, {
        status: CampaignParticipantStatus.COMPLETED,
        responseId: res.id,
      });
    }

    await updateCampaignStats(session.campaignParticipantId);
  }
  addZapierTriggerToQueue(
    ZapierTriggers.RESPONSE_SUBMITTED,
    { [ZapierTriggers.RESPONSE_SUBMITTED]: res },
    res.surveyTeamMap.team.orgId,
  );
}

export async function saveResponses(session: SaveResponsesContext) {
  let anonymous = session?.surveyTeamMap?.survey?.WaFlow?.anonymous ?? false;
  let questionResponses = session.responses as unknown as Array<QuestionResponse>;
  let responsesWithSha256 = questionResponses?.filter((response) => {
    return (
      response.response &&
      Array.isArray(response.response) &&
      response.response.some((r) => r.sha256)
    );
  });
  if (responsesWithSha256?.length > 0) {
    try {
      const settings = await getWaSettings(session.orgId);
      if (!settings) throw new Error(`WhatsApp settings not found for org: ${session.orgId}`);
      // Step 1: Download the media from WhatsApp API
      for await (let response of responsesWithSha256) {
        let parsedResponse = (response.response as WaMediaResponseItem[] | undefined)?.[0];
        if (!parsedResponse) continue;
        const fileUrl = await callMetaApi(`/${parsedResponse.id}`, "GET", settings.accessToken);
        if (fileUrl?.data) {
          // Step 2: Convert the downloaded media to a Buffer (for binary data)
          const fileResponse = await axios.get(fileUrl?.data.url, {
            responseType: "arraybuffer",
            headers: {
              Authorization: `Bearer ${settings.accessToken}`,
            },
          });
          // Step 3: Prepare S3 upload parameters
          const imageBuffer = Buffer.from(fileResponse.data, "binary");

          const s3Params = {
            Bucket: process.env.AWS_S3_BUCKET || "rateup-survey-uploads",
            Key: parsedResponse.file_name,
            ContentType: parsedResponse?.mime_type,
            Body: imageBuffer,
          };

          // Step 4: Upload the file to S3
          const obj = await uploadFile(s3Params);
          const key = obj?.Key ?? null;
          if (response.type) {
            (response.response as Record<string, unknown>)[response.type] = key;
          } else {
            // Untyped question types store the S3 key directly rather than under a type key.
            (response as { response: unknown }).response = key;
          }
        } else {
          log.error("Failed to download media file from WhatsApp API.");
        }
      }
    } catch (error) {
      log.error({ err: error }, "Error occurred while processing media file:");
    }
  }
  if (!session.surveyTeamMapId) {
    throw new Error("Session has no associated surveyTeamMapId");
  }
  // TODO: save name
  const contact = anonymous
    ? null
    : (await getOrCreateContactByPhone(session.phone, session.orgId))?.contact;
  const surveyResponse: CreateResponseInput = {
    surveyTeamMapId: session.surveyTeamMapId,
    responses: questionResponses,
    language: session.language,
    platform: ResponsePlatform.WHATSAPP,
    contactId: contact?.id,
    tag: session.tag,
    location: { coordinates: undefined },
    idempotencyKey: session.idempotencyKey ?? undefined,
  };
  const res = await createResponse(surveyResponse, false, null);
  await updateResponse(res.id, { ip: session.ip, location: undefined });
  // TODO: CHECK LOYALTY FEATURE
  // const loyalty = await prisma.loyaltyAction.findFirst({
  //   where: {
  //     flowId: session.surveyTeamMap.survey.WaFlow.dbFlowId,
  //     type: LoyaltyActionType.FeedBack,
  //   },
  // });
  // if (loyalty) {
  //   await handleLoyaltyFeedback(session.phone, loyalty);
  // }
  log.info(
    {
      responseId: res.id,
      surveyTeamMapId: session.surveyTeamMapId,
      count: questionResponses.length,
    },
    "Survey response saved",
  );

  // Everything past this point is downstream fan-out — a Google Sheets append, a
  // customer webhook, campaign bookkeeping, a Zapier trigger. The response row
  // is already durable, and a WhatsApp Flow endpoint has a 10-second budget for
  // the whole request, so none of it is allowed to hold the caller. Each is
  // logged on failure rather than surfaced: the respondent has already been told
  // their answers were saved, which is true.
  void publishSavedResponse(res, session, anonymous).catch((e) =>
    log.error({ err: e, responseId: res.id }, "Post-save fan-out failed"),
  );

  return res;
}
async function updateCampaignStats(id: string) {
  const participant = await prisma.campaignParticipant.findFirst({
    where: {
      id,
    },
    select: {
      campaignId: true,
    },
  });
  if (participant?.campaignId) {
    await prisma.campaignStats.update({
      where: {
        campaignId: participant?.campaignId,
      },
      data: {
        totalCompleted: { increment: 1 },
      },
    });
  }
}
async function updateDripCampaignStats(id: string) {
  const participant = await prisma.campaignParticipantDripStage.findFirst({
    where: {
      id,
    },
    select: {
      dripStageId: true,
    },
  });
  if (participant?.dripStageId) {
    await prisma.campaignDripStage.update({
      where: {
        id: participant?.dripStageId,
      },
      data: {
        totalCompleted: { increment: 1 },
      },
    });
  }
}

export async function sendTextMessage(
  to: { phone: string; orgId: string },
  title: string | null,
  description = "",
  // System/transactional callers (e.g. ticket notifications) pass true to bypass
  // the conversation limit; normal business text sends stay gated.
  skipConversationLimit = false,
) {
  const messageData = createTextMessage(to.phone, title, description);
  await sendMessage(
    to.orgId,
    messageData,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    "AUTOMATED",
    true,
    false,
    skipConversationLimit,
  );
}
export const handleMessageStatusUpdate = async (
  status: string,
  messageId: string,
  errors?: unknown,
  /**
   * Meta's per-message pricing signals off the status webhook. Optional throughout —
   * older messages and some statuses omit it — and purely informational: Meta bills
   * the customer's WABA directly, so this never gates metering or enforcement.
   */
  pricing?: WaStatusPricing,
) => {
  if (!messageId) return;
  const now = new Date().toISOString();

  await producer.send({
    topic: "status-events",
    messages: [
      {
        // Partition by message id so a message's statuses stay ordered. Without a
        // key kafkajs round-robins, and `sent`/`delivered`/`read` for one message can
        // land on different partitions and be applied out of order by different
        // consumers.
        key: messageId,
        value: JSON.stringify({
          status,
          messageId,
          errors,
          pricing,
          timestamp: now,
        }),
      },
    ],
  });
};

export async function setAiBotActiveStatus(
  phone: string,
  orgId: string,
  isActive: boolean,
  chatbotId: string,
) {
  await prisma.contact.updateMany({
    where: {
      phone: phone,
      orgId: orgId,
    },
    data: {
      isAiBotActive: isActive,
      chatbotId: chatbotId,
    },
  });
}

export async function getAiBotActiveStatus(phone: string, orgId: string) {
  const contact = await prisma.contact.findFirst({
    where: {
      phone: phone,
      orgId: orgId,
    },
  });
  return {
    isAiBotActive: contact?.isAiBotActive,
    chatbotId: contact?.chatbotId ?? null,
  };
}

export async function aibotNodeCompletion(phone: string, orgId: string) {
  const progress = await findRecentAutomation(phone, orgId);
  const automation = progress?.waAutomatedReply;
  if (automation) {
    const matchData = automation.matchData;
    const nextEdge = matchData?.json?.edges?.find((edge) => edge.target === progress.currentNode);

    if (!nextEdge) return;

    const nextNode = matchData?.json?.nodes?.find((node) => node.id === nextEdge.source);

    const automationLog = await logAutomationAction({
      phone,
      nodeId: progress.currentNode ?? "",
      automationId: automation.id,
      orgId,
    });

    if (nextNode) {
      await processNextNode(
        phone,
        automation,
        progress.currentNode ?? "",
        orgId,
        automationLog?.id ?? "",
      );
    }
  }
}

export async function handleLeadGen(body: WaMessageBody) {
  log.info("Handling Leadgen webhook");
  for (const lead of body.entry[0].changes) {
    const { page_id, ad_id, leadgen_id } = lead.value as LeadGenBody;
    const nodeType = "leadgenNode";
    const automation = await prisma.waAutomatedReply.findFirst({
      where: {
        matchData: {
          path: ["json", "nodes"],
          array_contains: [
            {
              type: nodeType,
              data: {
                ad: {
                  id: ad_id,
                },
                fbPageId: page_id,
              },
            },
          ],
        },
      },
    });
    if (!automation) {
      log.trace("No lead automation found for pageid:%s and ad id: %s", page_id, ad_id);
      return;
    }
    if (!automation.orgId) {
      log.trace("Lead automation has no associated orgId, automationId => %s", automation.id);
      return;
    }
    if (!(await hasFeature(automation.orgId, SubscriptionFeaturePathName.Whatsapp))) {
      log.trace("Aborting..Not subscribed to lead automation, orgId => %s", automation.orgId);
      return;
    }
    const matchData = automation.matchData;
    const leadgenNode = matchData?.json?.nodes.find((node) => node.type === "leadgenNode");
    if (!leadgenNode) {
      log.trace("Lead automation %s has no leadgenNode; aborting", automation.id);
      return;
    }
    const leadgenNodeData = leadgenNode.data as unknown as LeadgenNodeData;
    let phone = leadgenNodeData.phone;
    let errorMessage = "";
    let leadData;
    try {
      const res = await callMetaApi(
        `/${leadgen_id}?access_token=${leadgenNodeData.pageUserAccessToken}`,
        "GET",
      );
      log.info("Lead generated: %o", res.data);
      if (res.data) {
        leadData = res.data;
        await prisma.metaAssets.updateMany({
          where: {
            whatsappSettings: {
              phoneId: automation.whatsappSettingsPhoneId,
              orgId: automation.orgId,
            },
          },
          data: {
            leads: {
              push: res.data,
            },
          },
        });
        if (leadgenNodeData.phoneField?.trim().length) {
          const formValues = res.data.field_data;
          const fieldValue = formValues.find(
            (field: LeadGenFieldData) => field.name === leadgenNodeData.phoneField,
          );
          if (fieldValue) {
            phone = fieldValue?.values[0];
          }
        }
      }
    } catch (e) {
      log.error({ err: e }, "error in fetching lead details");
      const message =
        e && typeof e === "object" && "error" in e
          ? ((e as { error?: { message?: string } }).error?.message ?? "some error occured")
          : "some error occured";
      errorMessage = `Error: ${message}`;
    }
    const automationLog = await logAutomationAction({
      phone,
      nodeId: leadgenNode.id,
      automationId: automation.id,
      orgId: automation.orgId,
      response: {
        value: `lead generated ID:${leadgen_id}` + errorMessage,
        action: "initial_interaction",
      },
    });
    await processNextNode(
      phone,
      automation,
      leadgenNode.id,
      automation.orgId,
      automationLog?.id ?? "",
      leadData,
    );
  }
}
