import prisma from "../../../../../../../utils/prisma";
import {
  handleLCustomerAction,
  handleSendTemplate,
  updateLCustomer,
} from "../../../../../../loyalty/customer/customer.service";
import { LoyaltyApiFeature } from "../../../../../../../types/enums";

export async function getLoyaltyActionByActionId(action_id, orgId) {
  return await prisma.loyaltyAction.findUnique({
    where: {
      action_id_org_id_unique: {
        action_id,
        orgId,
      },
    },
  });
}

export async function processActionWebhook(data, orgId) {
  const apiSettings = (await prisma.loyaltyApiSettings.findMany({
    where: {
      orgId,
      feature: LoyaltyApiFeature.action,
    },
    include: {
      action: true,
    },
    orderBy: {
      priority: "asc",
    },
  })) as LoyaltyApiSetting[];

  if (!apiSettings.length) {
    return "no api settings found";
  }

  const phone = data[apiSettings[0].phoneKey];
  if (!phone) return "phone number not found";

  const customer = await prisma.loyaltyCustomer.findFirst({
    where: {
      Contact: {
        phone,
        orgId,
      },
    },
    include: {
      Contact: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!customer) return "customer not found";

  let shouldPerformAction = false;

  for (const apiSetting of apiSettings) {
    if (!apiSetting.active) continue;
    const fields = apiSetting.rules ? apiSetting.rules.fields : [];
    if (fields.length) {
      if (
        fields.every((field) => {
          const fieldValue = data[field.key];
          if (fieldValue) {
            return fieldValue === field.value;
          }
          return false;
        })
      ) {
        shouldPerformAction = true;
      }
    } else {
      shouldPerformAction = true;
    }
    if (!shouldPerformAction) continue;

    const actionData = apiSetting.action;
    if (!actionData) return "action not found";
    if (actionData.isAmountBased) {
      const amount = data[apiSetting.amountKey];
      if (!amount) return "amount not found";
    }
    if (!customer.active) await updateLCustomer(phone, orgId, { active: true });
    const {
      success,
      data: customerActionData,
      message,
    } = await handleLCustomerAction({
      customerId: customer.id,
      actionId: apiSetting.actionId,
      amount: apiSetting.amountKey ? data[apiSetting.amountKey] : undefined,
    });
    if (!success) {
      return "unable to perform action: " + message;
    }
    const { customerAction, customerPoints } = customerActionData;
    if (customerAction.action.waTemplateId) {
      await handleSendTemplate(
        customerAction.action.waTemplateId,
        customer.orgId,
        phone,
        [
          customer.Contact.name,
          customerAction.action.rewardId
            ? customerAction.action.reward.name
            : customerPoints?.toString(),
        ],
      );
    }
    return "action performed successfully";
  }
  if (!shouldPerformAction) return "no action performed";
}
