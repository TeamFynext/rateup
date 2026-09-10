import { LoyaltyTemplateTypes, WaAutomatedReplyResponseType } from "../../../types/enums.js";
import prisma from "../../../utils/prisma.js";
import type { CustomerLoyaltyAccount } from "../../../../generated/prisma/client.js";
import {
  LoyaltyTemplateInput,
  UpdateLoyaltyTemplateInput,
  EventTriggerInput,
  UpdateEventTriggerInput,
} from "./settings.schema.js";
import { sendMessage, sendTextMessage } from "../../whatsapp/whatsappSurvey/wasurvey.service.js";
import { LoyaltyWaCommand } from "../../../../generated/prisma/client.js";
import { getLCustomerByPhone, updateCustomerAccount } from "../accounts/account.service.js";
import { handleSendTemplate } from "../../contact/contact.utils.js";
import { renderReplyText } from "../richText.js";
import { handleWaJoinRegistration } from "../../whatsapp/whatsappSurvey/wasurvey.controller.js";
import {
  createListMessage,
  createReplyButtonsMessage,
  generateWhatsAppJoinLink,
} from "../../whatsapp/whatsappSurvey/wasurvey.utils.js";
import { getActiveLoyaltyRewards } from "../rewards/reward.service.js";
import { validateRedemption } from "../redemptionValidator.js";
import { redeemReward } from "../redemptions/redemption.service.js";

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
  phone: string,
  name: string,
  loyaltyWaCommand: LoyaltyWaCommand,
  orgId: string,
) {
  switch (loyaltyWaCommand.type) {
    case LoyaltyTemplateTypes.CustomerRegistration:
      await handleWaJoinRegistration({
        orgId,
        from: phone,
        userName: name,
        joinPayload: {},
        sourceIdentifier: "loyalty",
      });
      break;
    case LoyaltyTemplateTypes.PointInformation:
      await handleLoyaltyPointsCommand(phone, loyaltyWaCommand);
      break;
    case LoyaltyTemplateTypes.Referral:
      await handleReferralCommand(phone, loyaltyWaCommand);
      break;
    case LoyaltyTemplateTypes.CustomerRemoval:
      await handleCustomerRemovalFromLoyalty(phone, loyaltyWaCommand);
      break;
    case LoyaltyTemplateTypes.RewardsIssued:
      await handleIssuedRewardsCommand(phone, orgId, loyaltyWaCommand);
      break;
  }
}

export async function getAllLoyaltyWaCommands(orgId: string) {
  return await prisma.loyaltyWaCommand.findMany({
    where: {
      orgId,
    },
  });
}
async function handleIssuedRewardsCommand(
  phone: string,
  orgId: string,
  _loyaltyWaCommand: LoyaltyWaCommand,
) {
  const customer = await getLCustomerByPhone(phone, orgId);

  if (!customer || customer.status !== "active") {
    await sendTextMessage(
      { phone, orgId },
      null,
      "You are not an active member of our loyalty programme",
    );
    return;
  }

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
    await sendTextMessage(
      { phone, orgId },
      null,
      "No rewards are available for your current points right now.",
    );
    return;
  }

  const choices = eligibleRewards.map((reward) => ({
    id: `${REWARD_BUTTON_PREFIX}${reward.id}`,
    value: `${reward.name}`.slice(0, 24),
  }));

  const listMessage = createListMessage(
    phone,
    "Rewards",
    `You have ${customer.currentPoints} points. Select a reward to continue.`,
    "View rewards",
    choices,
  );

  await sendMessage(orgId, listMessage);
}

async function handleReferralCommand(phone: string, loyaltyWaCommand: LoyaltyWaCommand) {
  const { orgId, responseType, waTemplateId, content, whatsappSettingsPhoneId } = loyaltyWaCommand;

  const customer = await getLCustomerByPhone(phone, orgId);
  if (!customer || customer.status !== "active") {
    await sendTextMessage(
      { phone, orgId },
      null,
      "You are not an active member of our loyalty programme",
    );
    return;
  }

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

  const dynamicVariables = [referralCode, joinLink ?? referralCode];
  // Inbound keyword → open window → the reply's own text first; template only without one.
  const text = renderReplyText(content, dynamicVariables);
  if (text.trim().length > 0) {
    await sendTextMessage({ phone, orgId }, null, text);
  } else if (responseType === WaAutomatedReplyResponseType.Template && waTemplateId) {
    return await handleSendTemplate(waTemplateId, orgId, phone, dynamicVariables);
  } else {
    const linkText = joinLink ? `\n\nShare your referral link: ${joinLink}` : "";
    await sendTextMessage(
      { phone, orgId },
      null,
      `Your referral code is: ${referralCode}${linkText}`,
    );
  }
}

export async function handleLoyaltyRedeemInteraction(
  phone: string,
  parsedMessage: { buttonId?: string; message?: string },
  orgId: string,
) {
  const sendLoyaltyText = async (text: string) => {
    await sendTextMessage({ phone, orgId }, null, text);
  };

  const getActiveCustomer = async () => {
    const customer = await getLCustomerByPhone(phone, orgId);
    if (!customer || customer.status !== "active") {
      await sendLoyaltyText("You are not an active member of our loyalty programme");
      return null;
    }
    return customer;
  };

  const buttonId = parsedMessage?.buttonId;
  if (!buttonId) return false;

  if (buttonId.startsWith(REWARD_BUTTON_PREFIX)) {
    await handleRewardSelection(buttonId, getActiveCustomer, orgId, phone);
    return true;
  }

  if (buttonId.startsWith(REWARD_CANCEL_PREFIX)) {
    await sendLoyaltyText("Reward redemption cancelled.");
    return true;
  }

  if (buttonId.startsWith(REWARD_CONFIRM_PREFIX)) {
    await handleRewardConfirmation(buttonId, getActiveCustomer, sendLoyaltyText);
    return true;
  }

  return false;
}

async function handleRewardSelection(
  buttonId: string,
  getActiveCustomer: () => Promise<CustomerLoyaltyAccount | null>,
  orgId: string,
  phone: string,
): Promise<void> {
  const rewardId = buttonId.slice(REWARD_BUTTON_PREFIX.length);
  const customer = await getActiveCustomer();
  if (!customer) return;

  const reward = await prisma.loyaltyReward.findUnique({
    where: { id: rewardId },
  });

  if (!reward || reward.programId !== customer.programId) {
    await sendTextMessage({ phone, orgId }, null, "Selected reward is invalid.");
    return;
  }

  const inStock = reward.stockQuantity === null || reward.stockRedeemed < reward.stockQuantity;
  const hasPoints = reward.rewardType === "assigned" || customer.currentPoints >= reward.pointsCost;

  if (!inStock || !hasPoints) {
    await sendTextMessage(
      { phone, orgId },
      null,
      "This reward is no longer available or you do not have enough points.",
    );
    return;
  }

  const confirmationMessage = createReplyButtonsMessage(
    phone,
    "Confirm redemption",
    `Redeem ${reward.name} for ${reward.pointsCost} points?`,
    [
      { id: `${REWARD_CONFIRM_PREFIX}${reward.id}`, value: "Confirm" },
      { id: `${REWARD_CANCEL_PREFIX}${reward.id}`, value: "Cancel" },
    ],
  );

  await sendMessage(orgId, confirmationMessage);
}

async function handleRewardConfirmation(
  buttonId: string,
  getActiveCustomer: () => Promise<CustomerLoyaltyAccount | null>,
  sendLoyaltyText: (text: string) => Promise<void>,
): Promise<void> {
  const rewardId = buttonId.slice(REWARD_CONFIRM_PREFIX.length);
  const customer = await getActiveCustomer();
  if (!customer) return;

  try {
    // The validator is called first only so the customer can be told WHICH rule
    // refused them; redeemReward validates again for itself.
    const validation = await validateRedemption(customer.id, rewardId, {});
    if (!validation.valid) {
      await sendLoyaltyText(
        validation.violations.join(", ") || "Unable to redeem reward right now.",
      );
      return;
    }

    const result = await redeemReward(customer.programId, {
      customerId: customer.id,
      rewardId,
      notes: "WhatsApp redeem flow",
    });

    const codeText = result?.shortCode ? `\nRedemption code: ${result.shortCode}` : "";

    await sendLoyaltyText(`${"Reward redeemed successfully."}${codeText}`);
  } catch (error) {
    await sendLoyaltyText(
      error instanceof Error ? error.message : "Unable to redeem reward right now.",
    );
  }
}
export async function handleLoyaltyPointsCommand(
  phone: string,
  loyaltyWaCommand: LoyaltyWaCommand,
) {
  const { orgId, responseType, waTemplateId, content } = loyaltyWaCommand;
  const customer = await getLCustomerByPhone(phone, orgId);
  if (!customer || customer.status !== "active") {
    const message = `You are not an active member of our loyalty programme`;
    await sendTextMessage({ phone, orgId }, null, message);
    return;
  }
  const dynamicVariables = [
    customer.currentPoints,
    customer.lifetimePoints - customer.currentPoints,
    customer.lifetimePoints,
  ];

  // The customer just texted us, so the 24-hour window is open: the reply's own text is
  // free and immediate. The template is for customers who have not messaged (see
  // contact.controller's registration reply) and is only used here when there is no text.
  const text = renderReplyText(content, dynamicVariables);
  if (text.trim().length > 0) {
    await sendTextMessage({ phone, orgId }, null, text);
  } else if (responseType === WaAutomatedReplyResponseType.Template) {
    return await handleSendTemplate(waTemplateId, orgId, phone, dynamicVariables);
  }
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
  phone: string,
  loyaltyWaCommand: LoyaltyWaCommand,
) {
  const { orgId, responseType, waTemplateId, content } = loyaltyWaCommand;
  const customer = await getLCustomerByPhone(phone, orgId);
  if (!customer || customer.status !== "active") {
    const message = `You are not an active member of our loyalty programme`;
    await sendTextMessage({ phone, orgId }, null, message);
    return;
  }
  await updateCustomerAccount(customer.id, { status: "inactive" }, customer.programId);
  // Inbound keyword → open window → the reply's own text first; template only without one.
  const text = renderReplyText(content, []);
  if (text.trim().length > 0) {
    await sendTextMessage({ phone, orgId }, null, text);
  } else if (responseType === WaAutomatedReplyResponseType.Template) {
    await handleSendTemplate(waTemplateId, orgId, phone, []);
  }
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
