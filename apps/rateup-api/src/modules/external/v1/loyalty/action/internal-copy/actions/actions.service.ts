// import prisma from "../../../../../../../utils/prisma.js";
// import {
//   handleLCustomerAction,
//   handleSendTemplate,
//   updateLCustomer,
// } from "../../../../../../loyalty/customer/customer.service.js";
// import { LoyaltyApiFeature } from "../../../../../../../types/enums.js";
// import { log } from "../../../../../../../utils/logger.js";
// import { parsePhoneNumber } from "libphonenumber-js";

export async function processActionWebhook(data, orgId) {
  // const apiSettings = (await prisma.loyaltyApiSettings.findMany({
  //   where: {
  //     orgId,
  //     feature: LoyaltyApiFeature.action,
  //   },
  //   include: {
  //     action: true,
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
  // let shouldPerformAction = false;
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
  //       shouldPerformAction = true;
  //     }
  //   } else {
  //     shouldPerformAction = true;
  //   }
  //   if (!shouldPerformAction) continue;
  //   const actionData = apiSetting.action;
  //   if (!actionData) return "action not found";
  //   if (actionData.isAmountBased) {
  //     const amount = data[apiSetting.amountKey];
  //     if (!amount) return "amount not found";
  //   }
  //   if (!customer.active) await updateLCustomer(phone, orgId, { active: true });
  //   const {
  //     success,
  //     data: customerActionData,
  //     message,
  //   } = await handleLCustomerAction({
  //     customerId: customer.id,
  //     actionId: apiSetting.actionId,
  //     amount: apiSetting.amountKey
  //       ? Number(data[apiSetting.amountKey])
  //       : undefined,
  //   });
  //   if (!success) {
  //     return "unable to perform action: " + message;
  //   }
  //   const { customerAction, customerPoints } = customerActionData;
  //   if (customerAction.action.waTemplateId) {
  //     await handleSendTemplate(
  //       customerAction.action.waTemplateId,
  //       customer.orgId,
  //       phone,
  //       [
  //         customer.Contact.name,
  //         customerAction.action.rewardId
  //           ? customerAction.action.reward.name
  //           : customerPoints?.toString(),
  //       ],
  //     );
  //   }
  //   return "action performed successfully";
  // }
  // if (!shouldPerformAction) return "no action performed";
}
