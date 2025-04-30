import { LoyaltyApiFeature } from "../../../../../../../types/enums";
import prisma from "../../../../../../../utils/prisma";
import {
  updateLCustomer,
  handleLCustomerAction,
  handleSendTemplate,
  updateLCustomerRedeemPoint,
} from "../../../../../../loyalty/customer/customer.service";
import {
  createRedeem,
  RedeemStatus,
} from "../../../../../../loyalty/redeems/redeem.service";

export async function processRedeemWebhook(data, orgId) {
  const apiSettings = (await prisma.loyaltyApiSettings.findMany({
    where: {
      orgId,
      feature: LoyaltyApiFeature.reward,
    },
    include: {
      reward: true,
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

  let shouldRedeem = false;

  for (const apiSetting of apiSettings) {
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
        shouldRedeem = true;
      }
    } else {
      shouldRedeem = true;
    }
    if (!shouldRedeem) continue;

    const reward = apiSetting.reward;
    if (!reward) return "reward not found";
    if (!customer.active) await updateLCustomer(phone, orgId, { active: true });
    const { redeem, message } = await createRedeem(customer.id, reward.id);
    if (redeem.status === RedeemStatus.ISSUED) {
      const updatedCustomer = await updateLCustomerRedeemPoint(
        customer.id,
        redeem.reward.points,
      );
      await handleSendTemplate(reward.waTemplateId, orgId, phone, [
        customer.Contact.name,
        reward.points?.toString(),
      ]);
      return "redeemed successfully";
    } else {
      return "cannot redeem reward" + message;
    }
  }
  if (!shouldRedeem) return "cannot redeem reward";
}
