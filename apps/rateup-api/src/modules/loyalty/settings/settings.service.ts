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
import dayjs from "dayjs";
import { getLCustomerByPhone, updateCustomerAccount } from "../accounts/account.service.js";
import { handleSendTemplate } from "../../contact/contact.utils.js";
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

/**
 * A WhatsApp command, within an org.
 *
 * This, updateLoyaltyWaCommand and deleteLoyaltyWaCommandById were all keyed on
 * the command id alone, while the list and the by-type lookup sitting beside them
 * were org-scoped — so the reads that enumerate were guarded and the ones that
 * fetch and write were not. See issues.txt 20.33.
 */
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

  if (responseType === WaAutomatedReplyResponseType.Template) {
    const dynamicVariables = [referralCode, joinLink ?? referralCode];
    return await handleSendTemplate(waTemplateId, orgId, phone, dynamicVariables);
  } else if (responseType === WaAutomatedReplyResponseType.Text) {
    const dynamicVariables = [referralCode, joinLink ?? referralCode];
    const message = replacedContentByDynamicVariable(content, dynamicVariables);
    await sendTextMessage({ phone, orgId }, null, richTextToPlainText(message));
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

    // This goes through redeemReward — the same path the API uses.
    //
    // It used to call assignRewardToCustomer and then a local handleDeduction,
    // which made it a FOURTH redemption path, and the one customers actually
    // reach. It wrote no LoyaltyRedemption row, and EVERY quantity rule in
    // redemptionValidator — one_time_use, max_redemptions_per_customer, _per_day,
    // _per_week, _per_month and the cooldown — is evaluated by counting those
    // rows. So none of those limits could ever be tripped by a WhatsApp
    // redemption: a "once per customer" reward could be taken repeatedly, subject
    // only to the balance and the reward-already-assigned check. It never touched
    // stockRedeemed either, so an inventory-limited reward was unlimited here.
    // Its deduction was also untransacted and wrote balanceAfter from a
    // pre-deduction read, and labelled every reward "point" regardless of type.
    // See issues.txt 20.34.
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

  if (responseType === WaAutomatedReplyResponseType.Template)
    return await handleSendTemplate(waTemplateId, orgId, phone, dynamicVariables);
  else if (responseType === WaAutomatedReplyResponseType.Text) {
    const message = replacedContentByDynamicVariable(content, dynamicVariables);
    await sendTextMessage({ phone, orgId }, null, richTextToPlainText(message));
  }
}
export async function handleLoyaltyFeedback(
  phone: string,
  action: {
    waTemplateId: string;
    orgId: string;
    startDate: Date | string;
    endDate: Date | string;
    rewardId?: string | null;
  },
) {
  const { waTemplateId, orgId } = action;
  if (dayjs().isBefore(dayjs(action.startDate)) || dayjs().isAfter(dayjs(action.endDate))) {
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

/**
 * `content` is the loyaltyWaCommand's raw `Json?` column: a rich-text document that is
 * either the document node itself (`{ content: [...] }`) or already the node array.
 */
export function replacedContentByDynamicVariable(
  content: string | RichTextNode | RichTextNode[] | null | undefined,
  dynamicVariables: (string | number)[],
): RichTextNode[] {
  const contentArray: RichTextNode[] = Array.isArray(content)
    ? content
    : typeof content === "string"
      ? []
      : (content?.content ?? []);
  // A DEEP copy. `[...contentArray]` copies the outer array and nothing else, and
  // the loop below assigns `content.text = …` on the nested nodes — which were the
  // caller's objects. Rendering therefore destroyed the placeholders in the source
  // document, so a LoyaltyWaCommand row read once and rendered for two customers
  // gave the SECOND customer the FIRST one's name and balance: by then there were
  // no placeholders left to substitute. Whether that happened depended on whether
  // the row object was reused across sends, and this function offered no
  // protection either way. See issues.txt 20.35.
  const contentCopy = structuredClone(contentArray);
  for (const para of contentCopy) {
    const contents = para.content;
    if (contents) {
      for (const content of contents) {
        if (content.text) {
          content.text = content.text.replace(/\{\{(\d+)\}\}/g, (_: string, index: string) =>
            String(dynamicVariables[Number(index) - 1] ?? `{{${index}}}`),
          );
        }
      }
    }
  }
  return contentCopy;
}

/**
 * WhatsApp text messages carry a plain string, but loyalty command bodies are stored as
 * rich-text documents. Flatten to text (one line per top-level block) before sending —
 * passing the node array straight through rendered as "[object Object]".
 */
export function richTextToPlainText(
  content: string | RichTextNode | RichTextNode[] | null | undefined,
): string {
  // Older rows store the body as a plain string rather than a rich-text document.
  if (typeof content === "string") return content;
  const nodes = Array.isArray(content) ? content : (content?.content ?? []);
  return nodes
    .map((node) => collectText(node))
    .filter((line) => line.length > 0)
    .join("\n");
}

function collectText(node: RichTextNode): string {
  if (typeof node.text === "string") return node.text;
  return (node.content ?? []).map((child) => collectText(child)).join("");
}

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
  if (responseType === WaAutomatedReplyResponseType.Template) {
    await handleSendTemplate(waTemplateId, orgId, phone, []);
  } else if (responseType === WaAutomatedReplyResponseType.Text) {
    await sendTextMessage({ phone, orgId }, null, richTextToPlainText(content));
  }
}

// Event Trigger CRUD Services
/**
 * `programId` is the CALLER's program, resolved from their session by the handler.
 * It used to be whatever the request body carried, which meant a trigger could be
 * created against another org's program — and it would then fire on that org's
 * customers, sending whatever template it named. See issues.txt 20.33.
 */
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

/**
 * `programId` is REQUIRED.
 *
 * It used to be optional, and the where clause was
 * `programId ? { programId } : undefined` — which prisma reads as "no filter at
 * all". The handler passed `request.query.programId` straight through and that
 * query parameter is optional, so `GET /api/loyalty/settings/event-triggers` with
 * no programId returned EVERY organisation's event triggers, each with its
 * `program` relation included: other orgs' programme ids, names and WhatsApp
 * settings ids, in one request, from an ordinary authenticated session.
 * See issues.txt 20.33.
 */
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
