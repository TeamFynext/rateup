import dayjs from "dayjs";
import {
  LoyaltyTemplateTypes,
  SubscriptionFeaturePathName,
  WaAutomatedReplyResponseType,
} from "../../../types/enums";
import { verifySubscription } from "../../../utils/auth";
import { log } from "../../../utils/logger";
import { getNestedProperty } from "../../../utils/misc/obj.utils";
import { getUniqueRandomAlphaId } from "../../../utils/misc/random.utils";
import prisma from "../../../utils/prisma";
import {
  decrementStatsCount,
  updateMonthlyStat,
} from "../../stats/stats.service";
import { sendTemplateToUserCore } from "../../whatsapp/messageTemplates/wa_templates.controller";
import { LoyaltyActionType } from "../actions/actions.schema";
import {
  getLoyaltyActionById,
  getLoyaltyActions,
  getReferralLoyaltyAction,
} from "../actions/actions.service";
import { createRedeem, RedeemStatus } from "../redeems/redeem.service";
import {
  getReferralCodeByActionAndCustomer,
  replacedContentByDynamicVariable,
} from "../settings/settings.service";
import { LCustomerInput } from "./customer.schema";
import { isLReferralAction, isPurchaseAction, parsePhoneforWa } from "../util";
import {
  ContactGroupType,
  LoyaltyAction,
  LoyaltyCustomer,
  LoyaltyWaCommand,
} from "../../../../generated/prisma/client";
import {
  createContact,
  getOrcreateContact,
} from "../../contact/contact.service";
import { MultipartFile } from "@fastify/multipart";
import { isValidPhoneNumber } from "libphonenumber-js";
import Papa from "papaparse";
import xlsx from "node-xlsx";
import { BATCH_SIZE } from "../../../utils/constants/constants";
import {
  createMultipleContactInput,
  PaginationQuery,
} from "../../contact/contact.schema";
import { getContactGroupById } from "../../contact/contactGroup/contactGroup.service";
import { AddNewContactsToGroupInput } from "../../contact/contactGroup/contactGroup.schema";
import { getContactTag } from "../../whatsapp/settings/wa_settings.service";
import { sendTextMessage } from "../../whatsapp/whatsappSurvey/wasurvey.service";
import { PrismaClientKnownRequestError } from "../../../../generated/prisma/internal/prismaNamespace";

let includeContact = {
  Contact: {
    select: {
      phone: true,
      name: true,
      source: true,
    },
  },
};
export async function createLCustomer(input: LCustomerInput) {
  const contact = await prisma.contact.upsert({
    where: {
      contact_phone_org_id_unique: {
        phone: parsePhoneforWa(input.phone),
        orgId: input.orgId,
      },
    },
    update: {
      source: ContactGroupType.LOYALTY,
      name: input.name,
      dob: input.dob ?? null,
      email: input.email,
      tags: input.tags,
      external_id: input.external_id,
      loyaltyCustomer: {
        create: {
          orgId: input.orgId,
        },
      },
    },
    create: {
      phone: parsePhoneforWa(input.phone),
      name: input.name,
      source: ContactGroupType.LOYALTY,
      orgId: input.orgId,
      dob: input.dob ?? null,
      email: input.email,
      tags: input.tags,
      external_id: input.external_id,
      loyaltyCustomer: {
        create: {
          orgId: input.orgId,
        },
      },
    },
    include: {
      loyaltyCustomer: true,
    },
  });
  await updateMonthlyStat(
    SubscriptionFeaturePathName.LoyaltyCustomer,
    input.orgId,
  );

  const customer = contact.loyaltyCustomer;
  const action = await getReferralLoyaltyAction(input.orgId);
  if (action) await getReferralCodeByActionAndCustomer(action.id, customer.id);
  return {
    ...customer,
    name: contact.name,
    phone: contact.phone,
    email: contact?.email,
    dob: contact?.dob,
  };
}

export async function handlePostRegisterAction(orgId, customerId) {
  const actions = await getLoyaltyActions(orgId);
  const registerActions = actions.filter(
    (a) => a.type === LoyaltyActionType.CustomerRegistration,
  );
  if (!registerActions.length) return;
  for (const action of registerActions) {
    const { success, data, message } = await handleLCustomerAction({
      action,
      customerId,
      actionId: action.id,
    });
    if (success) {
      const { customerAction, customer, customerPoints } = data;
      await handleSendTemplate(
        customerAction.action.waTemplateId,
        orgId,
        customer.Contact.phone,
        [customer.Contact.name, customerPoints?.toString()],
      );
    }
  }
}

export async function createCustomerAction({
  customerId,
  actionId,
  refereePhone,
  amount,
}: {
  customerId: string;
  actionId: string;
  refereePhone?: string;
  amount?: number;
}) {
  return await prisma.loyaltyActionCustomerMap.create({
    data: {
      customerId,
      actionId,
      refereePhone: parsePhoneforWa(refereePhone),
      amount,
    },
    include: {
      action: {
        include: {
          reward: true,
          refereeReward: true,
        },
      },
      customer: {
        include: includeContact,
      },
    },
  });
}

export async function updateLCustomerPoint(id, points) {
  return await prisma.loyaltyCustomer.update({
    where: {
      id,
    },
    data: {
      totalEarnedPoints: {
        increment: points,
      },
    },
    include: includeContact,
  });
}

export async function updateLCustomerRedeemPoint(id, points) {
  return await prisma.loyaltyCustomer.update({
    where: {
      id,
    },
    data: {
      redeemedPoints: {
        increment: points,
      },
    },
    include: includeContact,
  });
}

export async function getLCustomerPhoneById(id) {
  return await prisma.loyaltyCustomer.findUnique({
    where: {
      id,
    },
    select: {
      Contact: {
        select: {
          phone: true,
        },
      },
    },
  });
}

export async function getLCustomerById(id) {
  const customer = await prisma.loyaltyCustomer.findUnique({
    where: {
      id,
    },
    include: {
      ...includeContact,
      referralCodes: {
        select: {
          referralCode: true,
        },
      },
      redeems: {
        select: {
          reward: {
            select: {
              name: true,
              points: true,
            },
          },
          status: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      actions: {
        select: {
          action: {
            select: {
              name: true,
              points: true,
              type: true,
              refereePoints: true,
              isAmountBased: true,
              isAmountBasedForReferee: true,
              amount: true,
              reward: {
                select: {
                  name: true,
                },
              },
              refereeReward: {
                select: {
                  name: true,
                },
              },
            },
          },
          amount: true,
          refereePhone: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  for (const action of customer.actions) {
    action["refereeName"] = action.refereePhone
      ? (await getLCustomerByPhone(action.refereePhone, customer.orgId)).Contact
          .name
      : undefined;
  }

  const lastActionDate = customer?.actions[0]?.createdAt;
  const lastRedeemDate = customer?.redeems[0]?.createdAt;
  return {
    ...customer,
    balancePoints: customer?.totalEarnedPoints - customer?.redeemedPoints,
    lastActivityAt:
      lastActionDate && lastRedeemDate
        ? new Date(lastActionDate).getTime() >
          new Date(lastRedeemDate).getTime()
          ? lastActionDate
          : lastRedeemDate
        : lastActionDate || lastRedeemDate || customer.createdAt,
    stats: {
      "Total Actions": customer?.actions?.length,
      "Points Earned": customer?.totalEarnedPoints,
      Rewards: customer?.redeems?.filter(
        (r) => r.status !== RedeemStatus.FAILED,
      ).length,
      Referrals: customer?.actions?.filter(
        (a) => a.action.type === LoyaltyActionType.ReferralPurchase,
      ).length,
      "Total Spent": customer?.actions?.reduce((acc, a) => {
        if (a.amount && !a.refereePhone) acc += a.amount;
        return acc;
      }, 0),
    },
  };
}

export async function getLoyaltyCustomers(
  orgId: string,
  query?: PaginationQuery,
) {
  const {
    page = 0,
    limit = 500,
    search = "",
    sort = "createdAt",
    desc = "asc",
    type = ContactGroupType.NORMAL,
    ...filter
  } = query ?? {
    page: 0,
    limit: 500,
    search: "",
    sort: "createdAt",
    desc: "asc",
  };
  let filterData = [];
  if (filter) {
    const params = new URLSearchParams(filter);
    for await (const [key, value] of params.entries()) {
      if ("customerInfo" === key) {
        filterData.push({
          Contact: {
            name: {
              contains: value,
              mode: "insensitive",
            },
          },
        });
        filterData.push({
          Contact: {
            phone: {
              contains: value,
              mode: "insensitive",
            },
          },
        });
      } else if ("createdAt" === key) {
        filterData.push({
          [key]: {
            gte: new Date(value),
            lte: dayjs(value).endOf("D").toDate(),
          },
        });
      } else if ("filterGroupName" === key) {
        let splitValue = [...new Set(value?.split(","))];
        filterData.push({
          LoyaltyCustomerMap: {
            some: {
              contactGroupId: {
                in: splitValue,
              },
            },
          },
        });
      }
    }
  }
  if (search?.length > 0) {
    filterData.push({
      Contact: {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
    });
    filterData.push({
      Contact: {
        phone: {
          contains: search,
          mode: "insensitive",
        },
      },
    });
  }
  // Define the search condition
  const searchCondition: any =
    filterData?.length > 0
      ? {
          orgId,
          OR: filterData,
        }
      : { orgId };

  let sortBy;

  if (sort === "name") {
    sortBy = {
      Contact: {
        name: desc,
      },
    };
  }

  // Count total matching contacts
  const totalCount = await prisma.loyaltyCustomer.count({
    where: searchCondition,
  });

  const [totalCustomer, newCustomers] = await Promise.all([
    prisma.loyaltyCustomer.count({ where: { orgId } }),
    prisma.loyaltyCustomer.count({
      where: { orgId, createdAt: { gte: dayjs().startOf("D").toDate() } },
    }),
  ]);
  const includeCondition = {
    redeems: {
      include: {
        reward: true,
      },
    },
    actions: {
      include: {
        action: true,
      },
    },
    referralCodes: true,
    ...includeContact,
  };

  const customers = await prisma.loyaltyCustomer.findMany({
    where: searchCondition,
    include: includeCondition,
    skip: Number(page) * Number(limit),
    take: Number(limit),
    orderBy: sortBy ?? {
      [sort]: desc,
    },
  });

  return {
    customers: customers?.map((c) => {
      const actionObj = {};
      Object.values(LoyaltyActionType).map((a) => (actionObj[a] = []));
      c.actions.map((action) => {
        actionObj[action.action.type].push({
          ...action.action,
          createdAt: action.createdAt,
          amountSpent: action.amount,
        });
      });
      return {
        id: c.id,
        name: c.Contact.name,
        phone: c.Contact.phone,
        createdAt: c.createdAt,
        totalCount,
        ...actionObj,
        referralCodes: c.referralCodes.map((r) => r.referralCode),
        redeems: c.redeems.filter((r) => r.status !== RedeemStatus.FAILED),
        totalPoints: c.totalEarnedPoints,
        balancePoints: c.totalEarnedPoints - c.redeemedPoints,
      };
    }),
    stats: {
      "Total Customers": totalCustomer,
      "New Customers": newCustomers,
      "Active Customers": totalCustomer,
      "Inactive Customers": 0,
      "Customer Growth": newCustomers,
    },
  };
}

export async function deleteLoyaltyCustomer(id: string, orgId: string) {
  await prisma.loyaltyCustomer.delete({
    where: {
      id,
    },
  });
  await decrementStatsCount(orgId, "loyaltyCustomerCount");
}

export async function handleLoyaltyRegister(phone, name, loyaltyWaCommand) {
  const { orgId, responseType, waTemplateId, content } = loyaltyWaCommand;
  try {
    //subscription and usage check
    const customer = await getLCustomerByPhone(phone, orgId);
    if (customer) {
      if (!customer.active) {
        await updateLCustomer(phone, orgId, { active: true });
        return await sendTextMessage(
          {
            phone,
            orgId,
          },
          null,
          "You are loyalty account has activated successfully",
        );
      }
      return await sendTextMessage(
        {
          phone,
          orgId,
        },
        null,
        "You are already a member of our loyalty programme",
      );
    }
    const subscription = await verifySubscription(orgId, [
      SubscriptionFeaturePathName.LoyaltyCustomer,
    ]);
    const isAllowed = await verifyLCustomerMaxCountRestriction(
      orgId,
      subscription,
    );
    if (!isAllowed) {
      log.trace("max count reached/ subscription not found");
      return;
    }
    const res = await createLCustomer({
      phone,
      name,
      orgId,
    });
    const dynamicVariables = [res.name];
    if (responseType === WaAutomatedReplyResponseType.Template) {
      await handleSendTemplate(
        waTemplateId,
        orgId,
        res.phone,
        dynamicVariables,
      );
    } else if (responseType === WaAutomatedReplyResponseType.Text) {
      const message = replacedContentByDynamicVariable(
        content,
        dynamicVariables,
      );
      await sendTextMessage({ phone, orgId }, null, message);
    }
    await handlePostRegisterAction(orgId, res.id);
  } catch (e) {
    log.error(e);
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
      await sendTextMessage(
        {
          phone,
          orgId,
        },
        null,
        "You are already a member of our loyalty program\n\n Reply *Points* to know the current points details",
      );
    }
  }
}

export async function verifyLCustomerMaxCountRestriction(orgId, subscription) {
  if (!subscription) {
    log.trace("Subscription not found");
    return false;
  }
  const count = await prisma.loyaltyCustomer.count({
    where: {
      orgId,
    },
  });

  const { loyaltyCustomerCount } = await prisma.usageStats.findUnique({
    where: {
      orgId,
    },
    select: {
      loyaltyCustomerCount: true,
    },
  });

  if (loyaltyCustomerCount !== count)
    await prisma.usageStats.update({
      where: {
        orgId,
      },
      data: {
        loyaltyCustomerCount: count,
      },
    });

  if (
    count >=
    getNestedProperty(
      subscription?.features as unknown as object,
      SubscriptionFeaturePathName.LoyaltyCustomer,
    ).count.max
  ) {
    return false;
  }
  return true;
}

export async function updateLCustomer(phone, orgId, data) {
  const contact = await prisma.contact.findUnique({
    where: {
      contact_phone_org_id_unique: {
        phone: parsePhoneforWa(phone),
        orgId,
      },
    },
  });
  return await prisma.loyaltyCustomer.update({
    where: {
      contactId: contact.id,
    },
    data,
  });
}

export async function getLCustomerByPhone(phone, orgId) {
  return await prisma.loyaltyCustomer.findFirst({
    where: {
      Contact: {
        phone: parsePhoneforWa(phone),
        orgId,
      },
    },
    include: {
      referralCodes: true,
      org: {
        select: {
          name: true,
        },
      },
      Contact: {
        select: {
          name: true,
          phone: true,
          email: true,
          dob: true,
        },
      },
    },
  });
}

export async function getLCustomerReferralCodes(customerId) {
  return await prisma.loyaltyReferralCode.findMany({
    where: {
      customerId,
    },
  });
}

export async function createLoyaltyReferralCode(
  actionId: string,
  customerId: string,
  existingReferralCodes: string[],
) {
  const referralCode = getUniqueRandomAlphaId(8, existingReferralCodes);
  return await prisma.loyaltyReferralCode.create({
    data: {
      customerId,
      actionId,
      referralCode,
    },
  });
}

export async function getLoyaltyCustomerOrActionByReferralCode(referralCode) {
  return await prisma.loyaltyReferralCode.findUnique({
    where: {
      referralCode,
    },
  });
}

export async function handleLCustomerAction({
  action,
  customerId,
  actionId,
  refereePhone,
  refereeName,
  amount,
}: {
  action?: LoyaltyAction;
  customerId: string;
  actionId: string;
  refereePhone?: string;
  refereeName?: string;
  amount?: number;
}) {
  if (!action) action = await getLoyaltyActionById(actionId);
  if (
    dayjs().isBefore(dayjs(action.startDate)) ||
    dayjs().isAfter(dayjs(action.endDate))
  ) {
    return {
      success: false,
      message: "Action Not available on this date",
      customerId,
    };
  }
  //handling referee action
  let referee;
  let refereePoints = action.refereePoints;
  if (isLReferralAction(action.type) && refereePhone) {
    referee = await getLCustomerByPhone(refereePhone, action.orgId);
    if (referee && !action.isExistingUserReferralAllowed)
      return {
        success: false,
        message: "Existing Customers are not allowed to use referral",
        customerId: referee.id,
      };
    if (
      (action.refereeRewardId && action.isAmountBasedForReferee && !amount) ||
      amount < action.amount
    ) {
      return {
        success: false,
        message: "Minimum " + action.amount + " required",
        customerId,
      };
    }
    if (!referee) {
      referee = await createLCustomer({
        phone: refereePhone,
        orgId: action.orgId,
        name: refereeName,
      });
    } else if (!referee.active)
      updateLCustomer(refereePhone, action.orgId, { active: true });
    const res = await getLCustomerActionByRefereePhone(
      customerId,
      actionId,
      refereePhone,
    );
    if (res) {
      return {
        success: false,
        message: "Already referred by this number",
        customerId: referee.id,
      };
    }
    if (action.refereeRewardId) {
      const { redeem, message } = await createRedeem(
        referee.id,
        action.rewardId,
        true,
      );
      if (redeem.status === RedeemStatus.FAILED) {
        return {
          success: false,
          message,
          customerId: referee.id,
        };
      }
    }
    const refereeAction = await createCustomerAction({
      customerId: referee.id,
      actionId,
      amount,
    });

    if (!action.refereeRewardId) {
      referee = await updateLCustomerPoint(referee.id, refereePoints);
      if (isPurchaseAction(action.type) && action.isAmountBasedForReferee) {
        const points = Math.round((action.points / action.amount) * amount);
        refereePoints =
          points > action.maxPointsForReferee
            ? action.maxPointsForReferee
            : points;
      }
    }
  }
  //handling referrer/customer action having reward
  if (action.rewardId) {
    if (action.isAmountBased && (!amount || amount < action.amount)) {
      return {
        success: false,
        message: "Minimum " + action.amount + " required",
        customerId,
      };
    }
    const { redeem, message } = await createRedeem(
      customerId,
      action.rewardId,
      true,
    );
    if (redeem.status === RedeemStatus.FAILED) {
      return {
        success: false,
        message,
        customerId,
      };
    }
    const customerAction = await createCustomerAction({
      customerId,
      actionId,
      refereePhone,
      amount,
    });
    return {
      success: true,
      data: {
        customer: customerAction.customer,
        customerAction,
        referee,
        refereePoints,
      },
    };
  }
  //handling referrer/customer action having points
  let customerPoints = action.points;
  if (isPurchaseAction(action.type) && action.isAmountBased) {
    const points = Math.round((action.points / action.amount) * amount);
    customerPoints = points > action?.maxPoints ? action.maxPoints : points;
  }
  const customerAction = await createCustomerAction({
    customerId,
    actionId,
    refereePhone,
    amount,
  });
  const customer = await updateLCustomerPoint(customerId, customerPoints);
  return {
    success: true,
    data: { customer, customerAction, referee, customerPoints, refereePoints },
  };
}

export async function getLCustomerActionByRefereePhone(
  customerId,
  actionId,
  refereePhone,
) {
  return await prisma.loyaltyActionCustomerMap.findFirst({
    where: {
      customerId,
      actionId,
      refereePhone: parsePhoneforWa(refereePhone),
    },
    include: {
      customer: true,
    },
  });
}

export async function handleSendTemplate(
  waTemplateId,
  orgId,
  phone,
  dynamicVariables,
) {
  if (!waTemplateId) {
    log.trace("No template Id found");
    return;
  }
  const components = [];
  components.push({
    type: "body",
    parameters: dynamicVariables.map((data: string) => ({
      type: "text",
      text: data,
    })),
  });
  await sendTemplateToUserCore(orgId, waTemplateId, phone, components);
}

export async function importCSVContacts(
  fileBody: MultipartFile,
  orgId: string,
  tags: string[],
  updateExisting: boolean = false,
  contactGroupId?: string,
) {
  const { mimetype } = fileBody;
  const csvType = ["text/csv", "application/vnd.ms-excel"];
  const file = csvType.includes(mimetype)
    ? fileBody.file
    : await fileBody.toBuffer();

  return new Promise(async (resolve, reject) => {
    let contacts = [];
    let errorContact = [];

    const processContact = (contact) => {
      const formattedPhone = contact.phone?.startsWith("+")
        ? contact.phone.replace(/\s+/g, "")
        : `+${contact.phone.replace(/\s+/g, "")}`;

      if (
        !contact?.phone ||
        !isValidPhoneNumber(formattedPhone) ||
        !contact?.name
      ) {
        errorContact.push({
          name: contact?.name || "name is missing/invalid",
          phone: contact?.phone || "phone is missing/invalid",
        });
      } else {
        contact.phone = formattedPhone.slice(1); // Remove the '+' for storage
        if (contact.dob) {
          contact.dob = dayjs(contact.dob).add(10, "second").format();
        } else {
          contact.dob = null;
        }

        contacts.push(contact);
      }
    };

    const finalizeProcessing = async () => {
      try {
        if (contacts.length === 0 && errorContact.length > 0) {
          resolve({ data: errorContact, status: "error" });
        } else if (contacts.length > 0) {
          const res = await createCustomersFromCsv(
            contacts,
            orgId,
            tags,
            updateExisting,
            contactGroupId,
          );
          if (errorContact.length > 0) {
            resolve({ data: errorContact, status: "error" });
          } else {
            resolve({ data: res, status: "success" });
          }
        } else {
          throw new Error("No contacts found");
        }
      } catch (err) {
        reject(err);
      }
    };

    if (csvType.includes(mimetype)) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        chunkSize: 1024 * 1024,
        transformHeader: (header) => header?.trim()?.toLowerCase(),
        chunk: (results) => {
          if (results?.data) {
            results.data.forEach(processContact);
          }
        },
        complete: finalizeProcessing,
        error: (error) => {
          reject(error);
        },
      });
    } else {
      const workSheetsFromFile = xlsx.parse(file, {
        cellDates: true,
      });

      const headers =
        workSheetsFromFile?.[0]?.data?.[0]?.map((header) =>
          header?.toString().toLowerCase(),
        ) ?? [];
      const headerIndices = headers.map((header, index) => ({ header, index }));

      workSheetsFromFile?.[0]?.data?.slice(1).forEach((row) => {
        let contact = {};
        headerIndices.forEach(({ header, index }) => {
          contact[header] = row[index]?.toString()?.trim();
        });
        processContact(contact);
      });
      await finalizeProcessing();
    }
  });
}

export async function createCustomersFromCsv(
  contacts,
  orgId,
  cTags,
  updateExisting = false,
  contactGroupId,
) {
  const tags = (await getContactTag(orgId))?.contactTags ?? [];
  let data = contacts?.map(
    ({ name, phone, email = "", dob = null, ...obj }) => {
      const result = {};
      if (tags?.length > 0) {
        for (const key of tags) {
          if (obj?.hasOwnProperty(key) && cTags.includes(key)) {
            result[key] = obj[key];
          }
        }
      }
      return {
        name,
        phone,
        email,
        dob,
        source: "CSV IMPORT",
        tags: result ?? undefined,
      };
    },
  );
  if (updateExisting) {
    await updateMulitplceContacts(data, orgId);
  } else {
    const filterNewContacts = await getExistingContactCountByPhno(
      data.map((item) => item.phone),
      orgId,
    );
    if (filterNewContacts === (data?.length ?? 0))
      throw new Error("All contacts already exist");
    await createMultipleCustomers(data, orgId);
  }
  if (contactGroupId) {
    const res = await addNewCustomersToGroup(contactGroupId, data, orgId);
    return res;
  }

  return "sucess";
}

export async function getExistingContactCountByPhno(
  ids: string[],
  orgId: string,
) {
  const BATCH_SIZE = 30000; // Keep it below the database limit
  let totalCount = 0;

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const count = await prisma.contact.count({
      where: {
        phone: {
          in: batch,
        },
        orgId,
        loyaltyCustomer: {
          isNot: null,
        },
      },
    });
    totalCount += count;
  }

  return totalCount;
}

export async function updateMulitplceContacts(
  contacts: createMultipleContactInput,
  orgId: string,
) {
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(({ phone, ...restContact }) =>
        prisma.contact.upsert({
          where: {
            contact_phone_org_id_unique: {
              phone,
              orgId,
            },
          },
          update: {
            ...restContact,
            loyaltyCustomer: {
              upsert: {
                create: {
                  orgId,
                },
                update: {},
              },
            },
          },
          create: {
            phone,
            ...restContact,
            orgId,
            loyaltyCustomer: {
              create: {
                orgId,
              },
            },
          },
        }),
      ),
    );
  }
}

export async function createMultipleCustomers(
  contacts: createMultipleContactInput,
  orgId: string,
) {
  const contactsData = contacts.map((contact) => ({
    ...contact,
    orgId,
    dob: contact.dob || null,
  }));

  for (const contactData of contactsData) {
    await prisma.contact.upsert({
      where: {
        contact_phone_org_id_unique: {
          phone: contactData.phone,
          orgId,
        },
      },
      create: {
        ...contactData,
        orgId,
        loyaltyCustomer: {
          create: {
            orgId,
          },
        },
      },
      update: {
        dob: contactData.dob,
        email: contactData.email,
        orgId,
        loyaltyCustomer: {
          create: {
            orgId,
          },
        },
      },
    });
  }

  return;
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function addNewCustomersToGroup(
  contactGroupId: string,
  contactsBody: AddNewContactsToGroupInput,
  orgId: string,
) {
  const contactGroup = await getContactGroupById(contactGroupId);
  if (!contactGroup) {
    throw new Error("Contact group not found");
  }
  const contacts = contactsBody.filter((data) =>
    isValidPhoneNumber(`+${data.phone}`),
  );
  const phoneChunks = chunkArray(
    contacts.map((contact) => contact.phone).filter((phone) => phone),
    BATCH_SIZE,
  );

  let createdContacts: any[] = [];

  for (const chunk of phoneChunks) {
    const result = await prisma.contact.findMany({
      where: {
        phone: { in: chunk },
        orgId,
      },
      include: {
        loyaltyCustomer: true,
      },
    });
    createdContacts = createdContacts.concat(result);
  }
  await prisma.loyaltyCustomerMap.createMany({
    skipDuplicates: true,
    data: createdContacts.map((contact) => ({
      contactGroupId: contactGroupId,
      loyaltyCustomerId: contact?.loyaltyCustomer?.id,
    })),
  });
}

export async function handleCustomerRemovalFromLoyalty(
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
  await updateLCustomer(phone, orgId, { active: false });
  if (responseType === WaAutomatedReplyResponseType.Template) {
    await handleSendTemplate(waTemplateId, orgId, phone, []);
  } else if (responseType === WaAutomatedReplyResponseType.Text) {
    await sendTextMessage({ phone, orgId }, null, content);
  }
}
