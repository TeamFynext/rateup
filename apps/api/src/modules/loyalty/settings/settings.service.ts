import { LoyaltyTemplateTypes, WaAutomatedReplyResponseType } from "../../../types/enums.js";
import prisma from "../../../utils/prisma.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import {
  LoyaltyTemplateInput,
  UpdateLoyaltyTemplateInput,
  EventTriggerInput,
  UpdateEventTriggerInput,
} from "./settings.schema.js";
import { LoyaltyWaCommand } from "../../../../generated/prisma/client.js";
import { getLCustomerByPhone, updateCustomerAccount } from "../accounts/account.service.js";
import { renderReplyText } from "../richText.js";
import { handleWaJoinRegistration } from "../../whatsapp/whatsappSurvey/wasurvey.controller.js";
import { generateWhatsAppJoinLink } from "../../whatsapp/whatsappSurvey/wasurvey.utils.js";
import { buildKeywordReply, SYSTEM_TEXTS } from "../messaging/content.js";
import {
  replyLoyalty,
  replySystem,
  replyText,
  type InboundReplyContext,
} from "../messaging/reply.js";
import { getActiveLoyaltyRewards } from "../rewards/reward.service.js";
import { validateRedemption } from "../redemptionValidator.js";
import { redeemReward } from "../redemptions/redemption.service.js";
import {
  ensureMemberCard,
  renderCardReply,
  sendMemberCard,
} from "../accounts/memberCard.service.js";

const REWARD_BUTTON_PREFIX = "loyalty_reward:";
const REWARD_CONFIRM_PREFIX = "loyalty_reward_confirm:";
const REWARD_CANCEL_PREFIX = "loyalty_reward_cancel:";

export async function createLoyaltyWaCommand(data: LoyaltyTemplateInput & { orgId: string }) {
  return await prisma.loyaltyWaCommand.create({
    data: {
      type: data.type,
      waTemplateId: data.waTemplateId?.length ? data.waTemplateId : undefined,
      orgId: data.orgId,
      requestMessage: data.requestMessage,
      content: data.content,
      responseType: data.responseType,
      whatsappSettingsPhoneId: data.whatsappSettingsPhoneId,
    },
  });
}

export async function getLoyaltyWaCommand(id: string, orgId: string) {
  return await prisma.loyaltyWaCommand.findFirst({
    where: {
      id,
      orgId,
    },
  });
}

export async function getLoyaltyWaCommandByType(type: LoyaltyTemplateTypes, orgId: string) {
  return await prisma.loyaltyWaCommand.findFirst({
    where: {
      type,
      orgId,
    },
  });
}

export async function updateLoyaltyWaCommand(
  id: string,
  data: UpdateLoyaltyTemplateInput,
  orgId: string,
) {
  // `actionId` is accepted on the input schema but `LoyaltyWaCommand` has no such column
  // (only `LoyaltyApiSettings` does, for a different feature) — drop it rather than pass
  // it through to Prisma, which would reject it as an unknown field at runtime.
  const { actionId: _actionId, ...rest } = data;
  return await prisma.loyaltyWaCommand.update({
    where: {
      id,
      orgId,
    },
    data: {
      ...rest,
      waTemplateId: data.waTemplateId?.length ? data.waTemplateId : undefined,
    },
  });
}

export async function getLoyaltyWaCommandByRequestMessage(orgId: string, requestMessage: string) {
  return await prisma.loyaltyWaCommand.findFirst({
    where: {
      orgId,
      requestMessage: {
        equals: requestMessage,
        mode: "insensitive",
      },
      org: {
        loyaltyProgram: {
          status: "active",
        },
      },
    },
  });
}

export async function handleLoyaltyWaCommand(
  reply: InboundReplyContext,
  loyaltyWaCommand: LoyaltyWaCommand,
  /** The number the customer messaged — what their welcome's referral link points at. */
  channelNumber?: string,
) {
  switch (loyaltyWaCommand.type) {
    case LoyaltyTemplateTypes.CustomerRegistration:
      await handleWaJoinRegistration({
        orgId: reply.orgId,
        from: reply.from,
        userName: reply.name ?? undefined,
        joinPayload: {},
        // Doubles as "they messaged us, so reply", which is why it falls back to a
        // non-number: the welcome must still go out when the channel is unknown.
        sourceIdentifier: channelNumber ?? "loyalty",
        reply,
      });
      break;
    case LoyaltyTemplateTypes.PointInformation:
      await handleLoyaltyPointsCommand(reply, loyaltyWaCommand);
      break;
    case LoyaltyTemplateTypes.Referral:
      await handleReferralCommand(reply, loyaltyWaCommand);
      break;
    case LoyaltyTemplateTypes.CustomerRemoval:
      await handleCustomerRemovalFromLoyalty(reply, loyaltyWaCommand);
      break;
    case LoyaltyTemplateTypes.RewardsIssued:
      await handleIssuedRewardsCommand(reply);
      break;
    case LoyaltyTemplateTypes.MemberCard:
      await handleMemberCardCommand(reply, loyaltyWaCommand);
      break;
  }
}

/** The member who wrote in, or null after telling them they are not one. */
async function activeMemberOrSay(reply: InboundReplyContext) {
  const customer = await getLCustomerByPhone(reply.from, reply.orgId);
  if (!customer || customer.status !== "active") {
    await replySystem(reply, "notMember");
    return null;
  }
  return customer;
}

/**
 * "card": the member asked for their QR card. The keyword arrived as a message, so the
 * conversation is open and the image can go straight out; the merchant's reply text, when
 * they wrote one, is the caption.
 */
async function handleMemberCardCommand(
  reply: InboundReplyContext,
  loyaltyWaCommand: LoyaltyWaCommand,
) {
  const customer = await activeMemberOrSay(reply);
  if (!customer) return;
  const cardCode = await ensureMemberCard(customer.id);
  const caption = renderCardReply(loyaltyWaCommand.content, {
    name: customer.contact?.name,
    cardCode,
  });
  const outcome = await sendMemberCard({
    orgId: reply.orgId,
    accountId: customer.id,
    caption,
    reply,
  });
  if (!outcome.sent) await replySystem(reply, "cardFailed");
}

export async function getAllLoyaltyWaCommands(orgId: string) {
  return await prisma.loyaltyWaCommand.findMany({
    where: {
      orgId,
    },
  });
}

async function handleIssuedRewardsCommand(reply: InboundReplyContext) {
  const customer = await activeMemberOrSay(reply);
  if (!customer) return;

  const rewards = await getActiveLoyaltyRewards(customer.programId);
  const eligibleRewards = rewards
    .filter((reward) => {
      const inStock = reward.stockQuantity === null || reward.stockRedeemed < reward.stockQuantity;
      const hasPoints =
        reward.rewardType === "assigned" || customer.currentPoints >= reward.pointsCost;
      return inStock && hasPoints;
    })
    .slice(0, 10);

  if (!eligibleRewards.length) {
    await replySystem(reply, "noRewards");
    return;
  }

  await replyLoyalty(reply, {
    key: "keyword:rewards",
    text: `You have ${customer.currentPoints} points. Select a reward to continue.`,
    parts: {
      title: "Rewards",
      list: {
        button: "View rewards",
        rows: eligibleRewards.map((reward) => ({
          id: `${REWARD_BUTTON_PREFIX}${reward.id}`,
          title: `${reward.name}`.slice(0, 24),
        })),
      },
    },
  });
}

/** A keyword's own text first; its template only when the merchant wrote none. */
async function replyWithKeyword(
  reply: InboundReplyContext,
  loyaltyWaCommand: LoyaltyWaCommand,
  params: string[],
) {
  const { responseType, waTemplateId, content } = loyaltyWaCommand;
  const message = buildKeywordReply({
    key: `keyword:${loyaltyWaCommand.type}`,
    text: renderReplyText(content, params),
    waTemplateId: responseType === WaAutomatedReplyResponseType.Template ? waTemplateId : null,
    params,
  });
  if (message.text === null && !message.artefacts) return;
  await replyLoyalty(reply, message);
}

async function handleReferralCommand(
  reply: InboundReplyContext,
  loyaltyWaCommand: LoyaltyWaCommand,
) {
  const { responseType, waTemplateId, content, whatsappSettingsPhoneId } = loyaltyWaCommand;

  const customer = await activeMemberOrSay(reply);
  if (!customer) return;

  const waSettings = whatsappSettingsPhoneId
    ? await prisma.whatsappSettings.findFirst({
        where: { phoneId: whatsappSettingsPhoneId },
        select: { phone: true },
      })
    : null;

  const referralCode = customer.referralCode;
  const joinLink = waSettings?.phone
    ? generateWhatsAppJoinLink({
        waNumber: waSettings.phone,
        referralCode,
      })
    : null;

  const params = [referralCode, joinLink ?? referralCode];
  const hasOwnWords = renderReplyText(content, params).trim().length > 0;
  if (hasOwnWords || (responseType === WaAutomatedReplyResponseType.Template && waTemplateId)) {
    await replyWithKeyword(reply, loyaltyWaCommand, params);
    return;
  }
  const linkText = joinLink ? `\n\nShare your referral link: ${joinLink}` : "";
  await replyText(reply, `Your referral code is: ${referralCode}${linkText}`);
}

export async function handleLoyaltyRedeemInteraction(
  reply: InboundReplyContext,
  parsedMessage: { buttonId?: string; message?: string },
) {
  const buttonId = parsedMessage?.buttonId;
  if (!buttonId) return false;

  if (buttonId.startsWith(REWARD_BUTTON_PREFIX)) {
    await handleRewardSelection(reply, buttonId);
    return true;
  }

  if (buttonId.startsWith(REWARD_CANCEL_PREFIX)) {
    await replySystem(reply, "redemptionCancelled");
    return true;
  }

  if (buttonId.startsWith(REWARD_CONFIRM_PREFIX)) {
    await handleRewardConfirmation(reply, buttonId);
    return true;
  }

  return false;
}

async function handleRewardSelection(reply: InboundReplyContext, buttonId: string): Promise<void> {
  const rewardId = buttonId.slice(REWARD_BUTTON_PREFIX.length);
  const customer = await activeMemberOrSay(reply);
  if (!customer) return;

  const reward = await prisma.loyaltyReward.findUnique({
    where: { id: rewardId },
  });

  if (!reward || reward.programId !== customer.programId) {
    await replySystem(reply, "rewardInvalid");
    return;
  }

  const inStock = reward.stockQuantity === null || reward.stockRedeemed < reward.stockQuantity;
  const hasPoints = reward.rewardType === "assigned" || customer.currentPoints >= reward.pointsCost;

  if (!inStock || !hasPoints) {
    await replySystem(reply, "rewardUnavailable");
    return;
  }

  await replyLoyalty(reply, {
    key: "reply:redeem_confirm",
    text: `Redeem ${reward.name} for ${reward.pointsCost} points?`,
    parts: {
      title: "Confirm redemption",
      buttons: [
        { id: `${REWARD_CONFIRM_PREFIX}${reward.id}`, title: "Confirm" },
        { id: `${REWARD_CANCEL_PREFIX}${reward.id}`, title: "Cancel" },
      ],
    },
  });
}

async function handleRewardConfirmation(
  reply: InboundReplyContext,
  buttonId: string,
): Promise<void> {
  const rewardId = buttonId.slice(REWARD_CONFIRM_PREFIX.length);
  const customer = await activeMemberOrSay(reply);
  if (!customer) return;

  try {
    // The validator is called first only so the customer can be told WHICH rule
    // refused them; redeemReward validates again for itself.
    const validation = await validateRedemption(customer.id, rewardId, {});
    if (!validation.valid) {
      await replyText(reply, validation.violations.join(", ") || SYSTEM_TEXTS.redeemFailed);
      return;
    }

    const result = await redeemReward(customer.programId, {
      customerId: customer.id,
      rewardId,
      notes: "WhatsApp redeem flow",
    });

    const codeText = result?.shortCode ? `\nRedemption code: ${result.shortCode}` : "";

    await replyText(reply, `Reward redeemed successfully.${codeText}`);
  } catch (error) {
    await replyText(reply, error instanceof Error ? error.message : SYSTEM_TEXTS.redeemFailed);
  }
}

export async function handleLoyaltyPointsCommand(
  reply: InboundReplyContext,
  loyaltyWaCommand: LoyaltyWaCommand,
) {
  const customer = await activeMemberOrSay(reply);
  if (!customer) return;
  const params = [
    customer.currentPoints,
    customer.lifetimePoints - customer.currentPoints,
    customer.lifetimePoints,
  ].map(String);

  await replyWithKeyword(reply, loyaltyWaCommand, params);
}

// The rich-text helpers live in ../richText.ts so the account service can use them too;
// re-exported because the contact controller and the tests import them from here.
export { replacedContentByDynamicVariable, richTextToPlainText } from "../richText.js";

export async function deleteLoyaltyWaCommandById(id: string, orgId: string) {
  return await prisma.loyaltyWaCommand.delete({
    where: {
      id,
      orgId,
    },
  });
}

export async function handleCustomerRemovalFromLoyalty(
  reply: InboundReplyContext,
  loyaltyWaCommand: LoyaltyWaCommand,
) {
  const customer = await activeMemberOrSay(reply);
  if (!customer) return;
  await updateCustomerAccount(customer.id, { status: "inactive" }, customer.programId);
  await replyWithKeyword(reply, loyaltyWaCommand, []);
}

// Event Trigger CRUD Services
export async function createEventTrigger(data: EventTriggerInput, programId: string) {
  return await prisma.loyaltyEventTrigger.create({
    data: {
      programId,
      eventType: data.eventType,
      enabled: data.enabled ?? true,
      triggerDays: data.triggerDays,
      waTemplateId: data.waTemplateId ? data.waTemplateId : undefined,
      rewardId: data.rewardId || undefined,
    },
    include: {
      waTemplate: true,
      reward: true,
    },
  });
}

export async function updateEventTrigger(
  id: string,
  data: UpdateEventTriggerInput,
  programId: string,
) {
  return await prisma.loyaltyEventTrigger.update({
    where: { id, programId },
    data,
    include: {
      waTemplate: true,
      reward: true,
    },
  });
}

export async function getEventTrigger(id: string, programId: string) {
  return await prisma.loyaltyEventTrigger.findFirst({
    where: { id, programId },
    include: {
      waTemplate: true,
      reward: true,
      program: true,
    },
  });
}

export async function getAllEventTriggers(programId: string) {
  return await prisma.loyaltyEventTrigger.findMany({
    where: { programId },
    include: {
      waTemplate: true,
      reward: true,
      program: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function deleteEventTrigger(id: string, programId: string) {
  return await prisma.loyaltyEventTrigger.delete({
    where: { id, programId },
  });
}

/**
 * When one scheduled reminder sends, and to whom.
 *
 * A single upsert on (programId, eventType). Every field is optional so the Reminders page
 * can save one control at a time; `undefined` leaves a setting alone while `null` clears
 * it, which is how "no gift" is expressed. The wording is not written here — it belongs to
 * the message, and `saveEventMessage` owns it.
 */
export async function saveReminderSchedule(input: {
  programId: string;
  eventType: LoyaltyEventType;
  enabled?: boolean;
  triggerDays?: number | null;
  leadDays?: number | null;
  sendHour?: number | null;
  rewardId?: string | null;
}) {
  const { programId, eventType, ...fields } = input;
  const patch = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  );

  return prisma.loyaltyEventTrigger.upsert({
    where: { programId_eventType: { programId, eventType } },
    update: patch,
    create: { programId, eventType, ...patch },
  });
}
