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
  handleLoyaltyRegister,
} from "../customer/customer.service";
import { getReferralLoyaltyAction } from "../actions/actions.service";
import { sendTextMessage } from "../../whatsapp/whatsappSurvey/wasurvey.service";
import { updateMonthlyStat } from "../../stats/stats.service";
import { log } from "../../../utils/logger";

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
  try {
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
    const { id, message } = res as unknown as {
      id: string;
      message: LoyaltyActionMessage;
    };
    const { referralCode } = await getReferralCodeByActionAndCustomer(
      id,
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

export async function handleLoyaltyPointsCommand(phone, orgId) {
  const customer = await getLCustomerByPhone(phone, orgId);
  if (!customer) {
    const message = `You are not a member of loyalty program yet`;
    await sendTextMessageAndUpdateStats(phone, orgId, null, message);
    return;
  }
  const message = `Current Point Balance: ${customer.totalEarnedPoints - customer.redeemedPoints}
  \n\nRedeemed Points: ${customer.redeemedPoints}
  \n\nTotal Earned Points: ${customer.totalEarnedPoints}`;
  await sendTextMessageAndUpdateStats(phone, orgId, "Loyalty Points", message);
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
