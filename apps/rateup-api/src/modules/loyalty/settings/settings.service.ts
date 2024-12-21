import { LoyaltyTemplate } from "@prisma/client";
import {
  LoyaltyTemplateTypes,
  SubscriptionFeaturePathName,
} from "../../../types/enums";
import prisma from "../../../utils/prisma";
import { LoyaltyTemplateInput } from "./settings.schema";
import {
  createLoyaltyReferralCode,
  getLCustomerByPhone,
  getLCustomerReferralCodes,
  handleCustomerInfoWaRequest,
  handleLoyaltyRegister,
} from "../customer/customer.service";
import { createTextMessage } from "../../whatsapp/whatsappSurvey/wasurvey.utils";
import { getReferralLoyaltyAction } from "../actions/actions.service";
import {
  sendMessage,
  sendTextMessage,
} from "../../whatsapp/whatsappSurvey/wasurvey.service";
import { getLoyaltyRewards } from "../rewards/rewards.service";
import { formatDateT1 } from "../../../utils/date";
import { updateMonthlyStat } from "../../stats/stats.service";

export async function createLoyaltyTemplate(
  data: LoyaltyTemplateInput & { orgId: string },
) {
  return await prisma.loyaltyTemplate.create({
    data: {
      type: data.type,
      waTemplateId: data.waTemplateId,
      orgId: data.orgId,
      requestMessage: data.requestMessage,
    },
  });
}

export async function getLoyaltyTemplate(
  type: LoyaltyTemplateTypes,
  orgId: string,
) {
  return await prisma.loyaltyTemplate.findUnique({
    where: {
      type_org_unique: {
        type,
        orgId,
      },
    },
  });
}

export async function updateLoyaltyTemplate(type, orgId, data) {
  return await prisma.loyaltyTemplate.update({
    where: {
      type_org_unique: {
        type,
        orgId,
      },
    },
    data,
  });
}

export async function getLoyaltyTemplateByRequestMessage(
  orgId,
  requestMessage,
) {
  return await prisma.loyaltyTemplate.findUnique({
    where: {
      request_message_org_unique: {
        orgId,
        requestMessage,
      },
    },
  });
}

export async function handleLoyaltyTemplate(
  phone,
  name,
  orgId,
  template: LoyaltyTemplate,
) {
  switch (template.type) {
    case LoyaltyTemplateTypes.CustomerInfo:
      await handleCustomerInfoWaRequest(phone, orgId);
      break;
    case LoyaltyTemplateTypes.CustomerRegistration:
      await handleLoyaltyRegister(phone, name, orgId);
      break;
  }
}

export async function getAllLoyaltyTemplates(orgId) {
  const templates = await prisma.loyaltyTemplate.findMany({
    where: {
      orgId,
    },
    include: {
      waTemplate: {
        select: {
          data: true,
        },
      },
    },
  });
  return templates.map((t) => ({
    ...t,
    templateName: (t.waTemplate.data as WaTemplateWithTypes["data"]).name,
    waTemplate: undefined,
  }));
}

export async function handleReferralCommand(phone, orgId) {
  const customer = await getLCustomerByPhone(phone, orgId);
  if (!customer) {
    const message = `You are not a member of loyalty program yet`;
    await sendTextMessageAndUpdateStats(phone, orgId, null, message);
    return;
  }
  const res = await getReferralLoyaltyAction(orgId);
  if (!res) {
    const message = `Thank you for reaching out. Unfortunately, there is no referral program yet`;
    await sendTextMessageAndUpdateStats(phone, orgId, null, message);
    return;
  }
  const {
    id,
    isAmountBased,
    amount,
    points,
    isAmountBasedForReferee,
    refereePoints,
  } = res;
  const message = `Please forward the following message to your Friends & Family. For each successful referrel you will earn ${isAmountBased ? `${points} points per amount of ${amount}` : `${points} points`}`;
  const { referralCode } = await getReferralCodeByActionAndCustomer(
    id,
    customer.id,
  );
  const copyMessage = `I would like to invite you to *${customer.org.name}!*. Using the following code, You will get ${isAmountBasedForReferee ? `${refereePoints} points per amount of ${amount}` : `${refereePoints} points`}.\n\n code: *${referralCode}*\n`;
  await sendTextMessageAndUpdateStats(phone, orgId, null, message);
  await sendTextMessageAndUpdateStats(phone, orgId, null, copyMessage);
}

export async function handleLoyaltyPointsCommand(phone, orgId) {
  const customer = await getLCustomerByPhone(phone, orgId);
  if (!customer) {
    const message = `You are not a member of loyalty program yet`;
    await sendTextMessageAndUpdateStats(phone, orgId, null, message);
    return;
  }
  const message = `Total Earned Points: ${customer.totalEarnedPoints}\n\nTotal Redeemed Points: ${customer.redeemedPoints}\n\nCurrent Balance Points: ${customer.totalEarnedPoints - customer.redeemedPoints}`;
  await sendTextMessageAndUpdateStats(phone, orgId, "Loyalty Points", message);
}

export async function handleLoyaltyRewardsCommand(phone, orgId) {
  const customer = await getLCustomerByPhone(phone, orgId);
  if (!customer) {
    const textMessage = createTextMessage(
      phone,
      null,
      `You are not a member of loyalty program yet`,
    );
    await sendMessage(orgId, textMessage);
    return;
  }
  const rewards = await getLoyaltyRewards(orgId);
  const message = !rewards.length
    ? `No rewards yet`
    : rewards
        .map(
          (r, index) =>
            `${index + 1}. *${r.name}* ( Required  points: ${r.points} ), Expiry Date: ${r.expireAt ? formatDateT1(r.expireAt) : "No Expiry"}`,
        )
        .join("\n");
  await sendTextMessageAndUpdateStats(phone, orgId, "Loyalty Rewards", message);
}

export async function getReferralCodeByActionAndCustomer(actionId, customerId) {
  let allReferralCodes = await prisma.loyaltyReferralCode.findMany();
  let referralByCustomerAction = allReferralCodes.find(
    (r) => r.customerId === customerId && r.actionId === actionId,
  );
  if (!referralByCustomerAction)
    referralByCustomerAction = await createLoyaltyReferralCode(
      actionId,
      customerId,
      allReferralCodes.map((r) => r.referralCode),
    );
  return referralByCustomerAction;
}

export async function sendTextMessageAndUpdateStats(
  phone,
  orgId,
  title,
  description,
) {
  await sendTextMessage({ phone, orgId }, title, description);
  await updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
}
