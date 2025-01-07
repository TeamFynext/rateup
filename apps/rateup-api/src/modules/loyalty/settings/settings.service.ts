import {
  LoyaltyTemplateTypes,
  SubscriptionFeaturePathName,
  WaAutomatedReplyResponseType,
} from "../../../types/enums";
import prisma from "../../../utils/prisma";
import { LoyaltyTemplateInput } from "./settings.schema";
import {
  createLoyaltyReferralCode,
  getLCustomerByPhone,
  handleLoyaltyRegister,
  handleSendTemplate,
} from "../customer/customer.service";
import { getLoyaltyActionById } from "../actions/actions.service";
import { sendTextMessage } from "../../whatsapp/whatsappSurvey/wasurvey.service";
import { updateMonthlyStat } from "../../stats/stats.service";
import { log } from "../../../utils/logger";
import { LoyaltyWaCommand } from "@prisma/client";

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
    if (!customer) {
      const message = `You are not a member of loyalty program yet`;
      await sendTextMessageAndUpdateStats(phone, orgId, null, message);
      return;
    }
    // const res = await getReferralLoyaltyAction(orgId);
    const action = await getLoyaltyActionById(actionId);
    if (!action) {
      const message = `Thank you for reaching out. Unfortunately, there is no referral program yet`;
      await sendTextMessageAndUpdateStats(phone, orgId, null, message);
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

    await sendTextMessageAndUpdateStats(phone, orgId, null, message.message);
    await sendTextMessageAndUpdateStats(
      phone,
      orgId,
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
  if (!customer) {
    const message = `You are not a member of loyalty program yet`;
    await sendTextMessageAndUpdateStats(phone, orgId, null, message);
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
    await sendTextMessageAndUpdateStats(phone, orgId, null, message);
  }
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

export async function sendTextMessageAndUpdateStats(
  phone,
  orgId,
  title,
  description,
) {
  await sendTextMessage({ phone, orgId }, title, description);
  await updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, orgId);
}

export async function deleteLoyaltyWaCommandById(id) {
  return await prisma.loyaltyWaCommand.delete({
    where: {
      id,
    },
  });
}
