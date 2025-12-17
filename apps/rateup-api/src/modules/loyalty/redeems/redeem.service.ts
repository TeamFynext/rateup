import dayjs from "dayjs";
import prisma from "../../../utils/prisma.js";
import {
  getLCustomerByPhone,
  handleSendTemplate,
} from "../customer/customer.service.js";

import { getUniqueRandomAlphaId } from "../../../utils/misc/random.utils.js";
import { LoyaltyWaCommand } from "../../../../generated/prisma/client.js";
import { replacedContentByDynamicVariable } from "../settings/settings.service.js";
import { WaAutomatedReplyResponseType } from "../../../types/enums.js";
import { sendTextMessage } from "../../whatsapp/whatsappSurvey/wasurvey.service.js";

export enum RedeemStatus {
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  ISSUED = "ISSUED",
  CLAIMED = "CLAIMED",
}

export async function createRedeem(customerId, rewardId, byAction = false) {
  const existingCodes = (
    await prisma.loyaltyRedeem.findMany({
      where: {
        code: {
          not: null,
        },
      },
    })
  ).map((r) => r.code);

  const uniqueCode = getUniqueRandomAlphaId(8, existingCodes);
  const { reward, customer, id } = await prisma.loyaltyRedeem.create({
    data: {
      customerId,
      rewardId,
      status: RedeemStatus.PROCESSING,
      code: uniqueCode,
    },
    include: {
      reward: true,
      customer: true,
    },
  });
  const isExpired = dayjs().isAfter(dayjs(reward.expireAt));
  const isBalance =
    reward.points <= customer.totalEarnedPoints - customer.redeemedPoints;
  const isUsedMax =
    (await getLoyaltyRedeemsByCustomerReward(customerId, rewardId)).length >=
    reward.maxPerUser;
  const redeem = await updateLoyaltyRedeem(id, {
    status:
      isExpired || (!byAction && !isBalance) || isUsedMax
        ? RedeemStatus.FAILED
        : RedeemStatus.ISSUED,
  });
  return {
    redeem,
    message: isExpired
      ? "Reward has expired"
      : !isBalance
        ? "Customer do not have enough points"
        : isUsedMax
          ? "Customer has reached reward limit"
          : "",
  };
}

export async function updateLoyaltyRedeem(id, data) {
  return await prisma.loyaltyRedeem.update({
    where: {
      id,
    },
    data,
    include: {
      reward: true,
    },
  });
}

export async function getLoyaltyRedeems(orgId: string) {
  return await prisma.loyaltyRedeem.findMany({
    where: {
      customer: {
        orgId,
      },
    },
    include: {
      reward: true,
      customer: {
        include: {
          Contact: {
            select: {
              name: true,
              phone: true,
            },
          },
        },
      },
    },
  });
}

export async function getLoyaltyRedeemsByCustomerReward(
  customerId: string,
  rewardId: string,
) {
  return await prisma.loyaltyRedeem.findMany({
    where: {
      customerId,
      rewardId,
      status: RedeemStatus.COMPLETED,
    },
  });
}

export async function getAllIssuedRedeemsByCustomer(customerId) {
  return await prisma.loyaltyRedeem.findMany({
    where: {
      customerId,
      status: RedeemStatus.ISSUED,
    },
    include: {
      reward: {
        select: {
          name: true,
          description: true,
        },
      },
    },
  });
}

export async function handleIssuedRewardsCommand(
  phone: string,
  loyaltyWaCommand: LoyaltyWaCommand,
) {
  const { orgId, responseType, waTemplateId, content } = loyaltyWaCommand;
  const customer = await getLCustomerByPhone(phone, orgId);
  if (!customer || !customer.active) {
    const message = `You are not an active member of our loyalty programme`;
    await sendTextMessage({ phone, orgId }, null, message);
    return;
  }
  const issuedRedeems = await getAllIssuedRedeemsByCustomer(customer.id);
  if (!issuedRedeems?.length) {
    const message = `No rewards have been issued to you at this time.`;
    await sendTextMessage({ phone, orgId }, null, message);
    return;
  }
  const redeemList = `${issuedRedeems.map((r, index) => `${index + 1}. *${r.reward.name}*\n ${r.reward.description ?? ""}\n Redeem Code: *${r.code}*`).join("\n")}`;
  const dynamicVariables = [customer.Contact.name, redeemList];
  if (responseType === WaAutomatedReplyResponseType.Template) {
    await handleSendTemplate(waTemplateId, orgId, phone, dynamicVariables);
  } else if (responseType === WaAutomatedReplyResponseType.Text) {
    const message = replacedContentByDynamicVariable(content, dynamicVariables);
    await sendTextMessage({ phone, orgId }, null, message);
  }
}
