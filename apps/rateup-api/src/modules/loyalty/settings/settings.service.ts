import {
  LoyaltyTemplateTypes,
  WaAutomatedReplyResponseType,
} from "../../../types/enums.js";
import prisma from "../../../utils/prisma.js";
import { LoyaltyTemplateInput } from "./settings.schema.js";
import { sendTextMessage } from "../../whatsapp/whatsappSurvey/wasurvey.service.js";
import { LoyaltyWaCommand } from "../../../../generated/prisma/client.js";
import dayjs from "dayjs";
import {
  getLCustomerByPhone,
  updateCustomerAccount,
} from "../accounts/account.service.js";
import { handleSendTemplate } from "../../contact/contact.utils.js";
import { handleWaJoinRegistration } from "../../whatsapp/whatsappSurvey/wasurvey.controller.js";

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
      // await handleReferralCommand(phone, loyaltyWaCommand);
      break;
    case LoyaltyTemplateTypes.CustomerRemoval:
      await handleCustomerRemovalFromLoyalty(phone, loyaltyWaCommand);
      break;
    case LoyaltyTemplateTypes.RewardsIssued:
      break;
    // await handleIssuedRewardsCommand(phone, loyaltyWaCommand);
  }
}

export async function getAllLoyaltyWaCommands(orgId) {
  return await prisma.loyaltyWaCommand.findMany({
    where: {
      orgId,
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
