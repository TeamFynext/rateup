import {
  LoyaltyTemplateTypes,
  SubscriptionFeaturePathName,
  WaAutomatedReplyResponseType,
} from "../../../types/enums";
import prisma from "../../../utils/prisma";
import { LoyaltyTemplateInput } from "./settings.schema";
import {
  createCustomerAction,
  createLoyaltyReferralCode,
  getLCustomerByPhone,
  handleCustomerRemovalFromLoyalty,
  handleLoyaltyRegister,
  handleSendTemplate,
  updateLCustomer,
  updateLCustomerPoint,
} from "../customer/customer.service";
import { getLoyaltyActionById } from "../actions/actions.service";
import { sendTextMessage } from "../../whatsapp/whatsappSurvey/wasurvey.service";
import { updateMonthlyStat } from "../../stats/stats.service";
import { log } from "../../../utils/logger";
import { LoyaltyWaCommand } from "../../../../generated/prisma/client";
import {
  createRedeem,
  handleIssuedRewardsCommand,
  RedeemStatus,
} from "../redeems/redeem.service";
import dayjs from "dayjs";

export async function createLoyaltyWaCommand(
  data: LoyaltyTemplateInput & { orgId: string },
) {
  return await prisma.loyaltyWaCommand.create({
    data: {
      type: data.type,
      waTemplateId: data.waTemplateId?.length ? data.waTemplateId : undefined,
      orgId: data.orgId,
      requestMessage: data.requestMessage,
      actionId: data.actionId?.length ? data.actionId : undefined,
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
    },
  });
}

export async function handleLoyaltyWaCommand(
  phone,
  name,
  loyaltyWaCommand: LoyaltyWaCommand,
) {
  switch (loyaltyWaCommand.type) {
    case LoyaltyTemplateTypes.CustomerRegistration:
      await handleLoyaltyRegister(phone, name, loyaltyWaCommand);
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
      await handleIssuedRewardsCommand(phone, loyaltyWaCommand);
  }
}

export async function getAllLoyaltyWaCommands(orgId) {
  return await prisma.loyaltyWaCommand.findMany({
    where: {
      orgId,
    },
  });
}

export async function handleReferralCommand(phone, loyaltyWaCommand) {
  try {
    const { orgId, actionId } = loyaltyWaCommand;
    const customer = await getLCustomerByPhone(phone, orgId);
    if (!customer || !customer.active) {
      const message = `You are not an active member of our loyalty programme`;
      await sendTextMessage({ phone, orgId }, null, message);
      return;
    }
    // const res = await getReferralLoyaltyAction(orgId);
    const action = await getLoyaltyActionById(actionId);
    if (!action) {
      const message = `Thank you for reaching out. Unfortunately, there is no referral program yet`;
      await sendTextMessage({ phone, orgId }, null, message);
      return;
    }
    const { message } = action as unknown as {
      message: LoyaltyActionMessage;
    };
    const { referralCode } = await getReferralCodeByActionAndCustomer(
      actionId,
      customer.id,
    );

    for (const para of message.forwardMessage) {
      const contents = para.content;
      if (contents) {
        for (const content of contents) {
          if (content.text) {
            content.text = content.text.replace("{{code}}", referralCode);
          }
        }
      }
    }

    await sendTextMessage({ phone, orgId }, null, message.message);
    await sendTextMessage(
      {
        phone,
        orgId,
      },
      null,
      message.forwardMessage,
    );
  } catch (e) {
    log.error(e);
    throw e;
  }
}

export async function handleLoyaltyPointsCommand(phone, loyaltyWaCommand) {
  const { orgId, responseType, waTemplateId, content } = loyaltyWaCommand;
  const customer = await getLCustomerByPhone(phone, orgId);
  if (!customer || !customer.active) {
    const message = `You are not an active member of our loyalty programme`;
    await sendTextMessage({ phone, orgId }, null, message);
    return;
  }
  const dynamicVariables = [
    customer.totalEarnedPoints - customer.redeemedPoints,
    customer.redeemedPoints,
    customer.totalEarnedPoints,
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
  if (!customer.active) await updateLCustomer(phone, orgId, { active: true });
  const existing = await prisma.loyaltyActionCustomerMap.findFirst({
    where: {
      customerId: customer.id,
      actionId: action.id,
    },
  });
  if (existing) {
    const message = `You have already given feedback for this action`;
    await sendTextMessage({ phone, orgId }, null, message);
    return;
  }

  //handling referrer/customer action having reward
  if (action.rewardId) {
    const { redeem, message } = await createRedeem(
      customer.id,
      action.rewardId,
      true,
    );
    if (redeem.status === RedeemStatus.FAILED) {
      return {
        success: false,
        message,
      };
    }
    await createCustomerAction({
      customerId: customer.id,
      actionId: action.id,
      refereePhone: "",
      amount: action.points,
    });
  } else {
    //handling referrer/customer action having points
    let customerPoints = action.points;
    await createCustomerAction({
      customerId: customer.id,
      actionId: action.id,
      refereePhone: "",
      amount: action.points,
    });
    await updateLCustomerPoint(customer.id, customerPoints);
  }

  await handleSendTemplate(waTemplateId, orgId, phone, []);
}

export function replacedContentByDynamicVariable(content, dynamicVariables) {
  const contentCopy = [...content];
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

export async function deleteLoyaltyWaCommandById(id) {
  return await prisma.loyaltyWaCommand.delete({
    where: {
      id,
    },
  });
}
