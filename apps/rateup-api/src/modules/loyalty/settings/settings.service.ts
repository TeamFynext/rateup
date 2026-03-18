import {
  LoyaltyTemplateTypes,
  WaAutomatedReplyResponseType,
} from "../../../types/enums.js";
import prisma from "../../../utils/prisma.js";
import {
  LoyaltyTemplateInput,
  EventTriggerInput,
  UpdateEventTriggerInput,
} from "./settings.schema.js";
import {
  sendMessage,
  sendTextMessage,
} from "../../whatsapp/whatsappSurvey/wasurvey.service.js";
import { LoyaltyWaCommand } from "../../../../generated/prisma/client.js";
import dayjs from "dayjs";
import {
  assignRewardToCustomer,
  getLCustomerByPhone,
  updateCustomerAccount,
} from "../accounts/account.service.js";
import { handleSendTemplate } from "../../contact/contact.utils.js";
import { handleWaJoinRegistration } from "../../whatsapp/whatsappSurvey/wasurvey.controller.js";
import {
  createListMessage,
  createReplyButtonsMessage,
  generateWhatsAppJoinLink,
} from "../../whatsapp/whatsappSurvey/wasurvey.utils.js";
import { getActiveLoyaltyRewards } from "../rewards/reward.service.js";
import { redeemReward } from "../redemptions/redemption.service.js";
import { validateRedemption } from "../redemptionValidator.js";

const REWARD_BUTTON_PREFIX = "loyalty_reward:";
const REWARD_CONFIRM_PREFIX = "loyalty_reward_confirm:";
const REWARD_CANCEL_PREFIX = "loyalty_reward_cancel:";

export async function createLoyaltyWaCommand(
  data: LoyaltyTemplateInput & { orgId: string },
) {
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

export async function getLoyaltyWaCommand(id: string) {
  return await prisma.loyaltyWaCommand.findUnique({
    where: {
      id,
    },
  });
}

export async function getLoyaltyWaCommandByType(type, orgId) {
  return await prisma.loyaltyWaCommand.findFirst({
    where: {
      type,
      orgId,
    },
  });
}

export async function updateLoyaltyWaCommand(id, data) {
  return await prisma.loyaltyWaCommand.update({
    where: {
      id,
    },
    data: {
      ...data,
      waTemplateId: data.waTemplateId?.length ? data.waTemplateId : undefined,
      actionId: data.actionId?.length ? data.actionId : undefined,
    },
  });
}

export async function getLoyaltyWaCommandByRequestMessage(
  orgId,
  requestMessage,
) {
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
  phone,
  name,
  loyaltyWaCommand: LoyaltyWaCommand,
  orgId,
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

export async function getAllLoyaltyWaCommands(orgId) {
  return await prisma.loyaltyWaCommand.findMany({
    where: {
      orgId,
    },
  });
}
async function handleIssuedRewardsCommand(phone, orgId, loyaltyWaCommand) {
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
      const inStock =
        reward.stockQuantity === null ||
        reward.stockRedeemed < reward.stockQuantity;
      const hasPoints =
        reward.rewardType === "assigned" ||
        customer.currentPoints >= reward.pointsCost;
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

async function handleReferralCommand(phone, loyaltyWaCommand) {
  const {
    orgId,
    responseType,
    waTemplateId,
    content,
    whatsappSettingsPhoneId,
  } = loyaltyWaCommand;

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

  if (responseType === WaAutomatedReplyResponseType.Template) {
    const dynamicVariables = [referralCode, joinLink ?? referralCode];
    return await handleSendTemplate(
      waTemplateId,
      orgId,
      phone,
      dynamicVariables,
    );
  } else if (responseType === WaAutomatedReplyResponseType.Text) {
    const dynamicVariables = [referralCode, joinLink ?? referralCode];
    const message = replacedContentByDynamicVariable(content, dynamicVariables);
    await sendTextMessage({ phone, orgId }, null, message);
  } else {
    const linkText = joinLink
      ? `\n\nShare your referral link: ${joinLink}`
      : "";
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
      await sendLoyaltyText(
        "You are not an active member of our loyalty programme",
      );
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
    await handleRewardConfirmation(
      buttonId,
      getActiveCustomer,
      sendLoyaltyText,
    );
    return true;
  }

  return false;
}

async function handleRewardSelection(
  buttonId: string,
  getActiveCustomer: () => Promise<any>,
  orgId: string,
  phone: string,
): Promise<void> {
  const rewardId = buttonId.slice(REWARD_BUTTON_PREFIX.length);
  const customer = await getActiveCustomer();
  if (!customer) return;

  const reward = await prisma.loyaltyReward.findUnique({
    where: { id: rewardId },
  });

  if (reward?.programId !== customer.programId) {
    await sendTextMessage(
      { phone, orgId },
      null,
      "Selected reward is invalid.",
    );
    return;
  }

  const inStock =
    reward.stockQuantity === null ||
    reward.stockRedeemed < reward.stockQuantity;
  const hasPoints =
    reward.rewardType === "assigned" ||
    customer.currentPoints >= reward.pointsCost;

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
  getActiveCustomer: () => Promise<any>,
  sendLoyaltyText: (text: string) => Promise<void>,
): Promise<void> {
  const rewardId = buttonId.slice(REWARD_CONFIRM_PREFIX.length);
  const customer = await getActiveCustomer();
  if (!customer) return;

  try {
    const validation = await validateRedemption(customer.id, rewardId, {});
    if (!validation.valid) {
      await sendLoyaltyText(
        validation.message || "Unable to redeem reward right now.",
      );
      return;
    }
    const result = await assignRewardToCustomer(
      customer.id,
      rewardId,
      "WhatsApp redeem flow",
    );
    if (result.id) {
      await handleDeduction(result?.reward, customer, result.reward?.programId);
    }

    const codeText = result?.shortCode
      ? `\nRedemption code: ${result.shortCode}`
      : "";

    await sendLoyaltyText(`${"Reward redeemed successfully."}${codeText}`);
  } catch (error) {
    await sendLoyaltyText(
      error?.message || "Unable to redeem reward right now.",
    );
  }
}
async function handleDeduction(reward, customer, programId) {
  // Deduct redemption cost
  await prisma.loyaltyTransaction.create({
    data: {
      accountId: customer.id,
      programId,
      transactionType: "redeem",
      source: "reward_redemption",
      points: -reward.pointsCost,
      balanceAfter: customer.currentPoints - reward.pointsCost,
      description: `Redeemed: ${reward.name} (Cost: ${reward.pointsCost})`,
      metadata: {
        rewardId: reward.id,
        rewardName: reward.name,
        redemptionType: "point",
      },
    },
  });

  // Update customer balance
  await prisma.customerLoyaltyAccount.update({
    where: { id: customer.id },
    data: {
      currentPoints: {
        decrement: reward.pointsCost,
      },
    },
  });
}
export async function handleLoyaltyPointsCommand(phone, loyaltyWaCommand) {
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

  if (responseType === WaAutomatedReplyResponseType.Template)
    return await handleSendTemplate(
      waTemplateId,
      orgId,
      phone,
      dynamicVariables,
    );
  else if (responseType === WaAutomatedReplyResponseType.Text) {
    const message = replacedContentByDynamicVariable(content, dynamicVariables);
    await sendTextMessage({ phone, orgId }, null, message);
  }
}
export async function handleLoyaltyFeedback(phone, action) {
  const { waTemplateId, orgId } = action;
  if (
    dayjs().isBefore(dayjs(action.startDate)) ||
    dayjs().isAfter(dayjs(action.endDate))
  ) {
    return { success: false, message: "Action Not available on this date" };
  }
  const customer = await getLCustomerByPhone(phone, orgId);

  if (!customer) {
    const message = `You are not a member of loyalty program yet`;
    await sendTextMessage({ phone, orgId }, null, message);
    return;
  }
  // if (customer.status !== "active") await updateLCustomer(phone, orgId, { status: "active" });
  // const existing = await prisma.loyaltyActionCustomerMap.findFirst({
  //   where: {
  //     customerId: customer.id,
  //     actionId: action.id,
  //   },
  // });
  // if (existing) {
  //   const message = `You have already given feedback for this action`;
  //   await sendTextMessage({ phone, orgId }, null, message);
  //   return;
  // }

  //handling referrer/customer action having reward
  if (action.rewardId) {
    // const { redeem, message } = await createRedeem(
    //   customer.id,
    //   action.rewardId,
    //   true
    // );
    // if (redeem.status === RedeemStatus.FAILED) {
    //   return {
    //     success: false,
    //     message,
    //   };
    // }
    // await createCustomerAction({
    //   customerId: customer.id,
    //   actionId: action.id,
    //   refereePhone: "",
    //   amount: action.points,
    // });
  } else {
    //handling referrer/customer action having points
    let customerPoints = action.points;
    // await createCustomerAction({
    //   customerId: customer.id,
    //   actionId: action.id,
    //   refereePhone: "",
    //   amount: action.points,
    // });
    // await updateLCustomerPoint(customer.id, customerPoints);
  }

  await handleSendTemplate(waTemplateId, orgId, phone, []);
}

export function replacedContentByDynamicVariable(content, dynamicVariables) {
  let contentArray = Array.isArray(content?.content)
    ? content.content
    : content;
  const contentCopy = [...contentArray];
  for (const para of contentCopy) {
    const contents = para.content;
    if (contents) {
      for (const content of contents) {
        if (content.text) {
          content.text = content.text.replace(
            /\{\{(\d+)\}\}/g,
            (_, index) => dynamicVariables[index - 1] ?? `{{${index}}}`,
          );
        }
      }
    }
  }
  return contentCopy;
}

export async function deleteLoyaltyWaCommandById(id) {
  return await prisma.loyaltyWaCommand.delete({
    where: {
      id,
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
  await updateCustomerAccount(customer.id, { status: "inactive" });
  if (responseType === WaAutomatedReplyResponseType.Template) {
    await handleSendTemplate(waTemplateId, orgId, phone, []);
  } else if (responseType === WaAutomatedReplyResponseType.Text) {
    await sendTextMessage({ phone, orgId }, null, content);
  }
}

// Event Trigger CRUD Services
export async function createEventTrigger(data: EventTriggerInput) {
  return await prisma.loyaltyEventTrigger.create({
    data: {
      programId: data.programId,
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
) {
  return await prisma.loyaltyEventTrigger.update({
    where: { id },
    data,
    include: {
      waTemplate: true,
      reward: true,
    },
  });
}

export async function getEventTrigger(id: string) {
  return await prisma.loyaltyEventTrigger.findUnique({
    where: { id },
    include: {
      waTemplate: true,
      reward: true,
      program: true,
    },
  });
}

export async function getAllEventTriggers(programId?: string) {
  return await prisma.loyaltyEventTrigger.findMany({
    where: programId ? { programId } : undefined,
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

export async function deleteEventTrigger(id: string) {
  return await prisma.loyaltyEventTrigger.delete({
    where: { id },
  });
}
