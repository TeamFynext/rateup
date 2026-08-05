import prisma from "../../../utils/prisma.js";
import { createCustomerAccount, findAccountByReferralCode } from "../accounts/account.service.js";

export async function trackReferral(
  programId: string,
  referralCode: string,
  refereeContactId: string,
) {
  const referrer = await findAccountByReferralCode(programId, referralCode);

  if (!referrer) {
    throw new Error("Invalid referral code");
  }

  // Check if referee already exists
  const existingReferee = await prisma.customerLoyaltyAccount.findUnique({
    where: {
      programId_contactId: {
        programId,
        contactId: refereeContactId,
      },
    },
  });

  if (existingReferee) {
    throw new Error("Customer already has an account");
  }

  // Get contact info
  const contact = await prisma.contact.findUnique({
    where: { id: refereeContactId },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  if (!contact.phone) {
    throw new Error("Contact has no phone number");
  }

  const referee = await createCustomerAccount(
    {
      phone: contact.phone,
      name: contact.name ?? "Customer",
      email: contact.email ?? undefined,
      dob: contact.dob ? contact.dob.toISOString() : undefined,
      referCode: referrer.referralCode,
      orgId: contact.orgId,
    },
    programId,
    contact.orgId,
  );

  // Create referral record
  const referral = await prisma.loyaltyReferral.create({
    data: {
      programId,
      referrerAccountId: referrer.id,
      refereeContactId,
      refereeAccountId: referee.id,
      status: "pending",
    },
  });

  return {
    referral,
    referrer,
    referee,
  };
}

export async function completeReferral(referralId: string, programId: string) {
  const referral = await prisma.loyaltyReferral.findFirst({
    where: { id: referralId, programId },
    include: {
      refereeAccount: true,
    },
  });

  if (!referral) {
    throw new Error("Referral not found");
  }

  if (referral.status !== "pending") {
    throw new Error("Referral is not pending");
  }

  // Mark as completed. No points move here; see the note above.
  await prisma.loyaltyReferral.update({
    where: { id: referralId },
    data: {
      status: "completed",
      completedAt: new Date(),
    },
  });

  return referral;
}

export async function getReferralsByReferrer(referrerId: string) {
  return await prisma.loyaltyReferral.findMany({
    where: { referrerAccountId: referrerId },
    include: {
      refereeAccount: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getReferralsByProgram(programId: string) {
  return await prisma.loyaltyReferral.findMany({
    where: { programId },
    include: {
      referrerAccount: true,
      refereeAccount: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
