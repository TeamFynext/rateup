import prisma from "../../../../utils/prisma";
import { CreateReferralCodeInput } from "./referralCode.schema";

export async function createReferralCode(rcode: CreateReferralCodeInput) {
  return await prisma.lcReferralCode.create({
    data: rcode,
  });
}

export async function getReferralCodeByCode(referralCode: string) {
  return await prisma.lcReferralCode.findUnique({
    where: {
      referralCode,
    },
  });
}

export async function deleteReferralCode(referralCode: string) {
  return await prisma.lcReferralCode.delete({
    where: {
      referralCode,
    },
  });
}
