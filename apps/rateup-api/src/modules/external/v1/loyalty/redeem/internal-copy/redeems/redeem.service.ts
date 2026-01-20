import { parsePhoneNumber } from "libphonenumber-js";
import { LoyaltyApiFeature } from "../../../../../../../types/enums.js";
import { log } from "../../../../../../../utils/logger.js";
import prisma from "../../../../../../../utils/prisma.js";
//import {
//  updateLCustomer,
//  handleLCustomerAction,
//  handleSendTemplate,
//  updateLCustomerRedeemPoint,
//} from "../../../../../../loyalty/customer/customer.service.js";

export async function processRedeemWebhook(data, orgId) {
  // const apiSettings = (await prisma.loyaltyApiSettings.findMany({
  //   where: {
  //     orgId,
  //     feature: LoyaltyApiFeature.reward,
  //   },
  //   include: {
  //     reward: true,
  //   },
  //   orderBy: {
  //     priority: "asc",
  //   },
  // })) as LoyaltyApiSetting[];
  // if (!apiSettings.length) {
  //   return "no api settings found";
  // }
  // const phoneNumber = data[apiSettings[0].phoneKey];
  // if (!phoneNumber) return "phone number not found";
  // const phone = parsePhoneNumber(phoneNumber, "IN");
  // if (phone.isValid() === false) {
  //   log.trace("Invalid Phone number");
  //   return false;
  // }
  // const customer = await prisma.loyaltyCustomer.findFirst({
  //   where: {
  //     Contact: {
  //       phone: phone.number.replace("+", ""),
  //       orgId,
  //     },
  //   },
  //   include: {
  //     Contact: {
  //       select: {
  //         name: true,
  //       },
  //     },
  //   },
  // });
  // if (!customer) return "customer not found";
  // let shouldRedeem = false;
  // for (const apiSetting of apiSettings) {
  //   if (!apiSetting.active) continue;
  //   const fields = apiSetting.rules ? apiSetting.rules.fields : [];
  //   if (fields.length) {
  //     if (
  //       fields.every((field) => {
  //         const fieldValue = data[field.key];
  //         if (fieldValue) {
  //           return fieldValue === field.value;
  //         }
  //         return false;
  //       })
  //     ) {
  //       shouldRedeem = true;
  //     }
  //   } else {
  //     shouldRedeem = true;
  //   }
  //   if (!shouldRedeem) continue;
  //   const reward = apiSetting.reward;
  //   if (!reward) return "reward not found";
  //   if (!customer.active) await updateLCustomer(phone, orgId, { active: true });
  //   const { redeem, message } = await createRedeem(customer.id, reward.id);
  //   if (redeem.status === RedeemStatus.ISSUED) {
  //     const updatedCustomer = await updateLCustomerRedeemPoint(
  //       customer.id,
  //       redeem.reward.points,
  //     );
  //     await handleSendTemplate(reward.waTemplateId, orgId, phone, [
  //       customer.Contact.name,
  //       reward.points?.toString(),
  //     ]);
  //     return "redeemed successfully";
  //   } else {
  //     return "cannot redeem reward" + message;
  //   }
  // }
  // if (!shouldRedeem) return "cannot redeem reward";
}
