import prisma from "../../../../utils/prisma";
import { CreateLCustomerInput, UpdateLCustomerInput } from "./customer.schema";

export async function createLCustomer(customer: CreateLCustomerInput) {
  return await prisma.loyaltyCustomer.create({
    data: customer,
  });
}

export async function getLCustomerById(customerId: string) {
  return await prisma.loyaltyCustomer.findUnique({
    where: {
      id: customerId,
    },
  });
}

export async function getLCustomersByOrg(orgId: string) {
  return await prisma.loyaltyCustomer.findMany({
    where: {
      orgId,
    },
  });
}

export async function getLCustomerByPhone(orgId: string, phone: string) {
  return await prisma.loyaltyCustomer.findUnique({
    where: {
      loyalty_customer_phone_org_unique: {
        orgId,
        phone,
      },
    },
  });
}

export async function getLCustomerByReferralCode(referralCode: string) {
  return await prisma.loyaltyCustomer.findFirst({
    where: {
      LcReferralCode: {
        some: {
          referralCode,
        },
      },
    },
  });
}

export async function updateLCustomer(
  customerId: string,
  customer: UpdateLCustomerInput,
) {
  return await prisma.loyaltyCustomer.update({
    where: {
      id: customerId,
    },
    data: customer,
  });
}
export async function deleteLCustomer(customerId: string) {
  return await prisma.loyaltyCustomer.delete({
    where: {
      id: customerId,
    },
  });
}

export async function getOrCreateLCustomerByPhone(
  orgId: string,
  phone: string,
) {
  const customer = await getLCustomerByPhone(orgId, phone);
  if (customer) {
    return customer;
  } else {
    return await createLCustomer({
      phone,
      orgId,
    });
  }
}
