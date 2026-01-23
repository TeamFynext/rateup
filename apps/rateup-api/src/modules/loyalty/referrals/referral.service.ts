import prisma from "../../../utils/prisma.js";

export async function trackReferral(
  programId: string,
  referralCode: string,
  refereeContactId: string,
) {
  // Find referrer by referral code
  const referrer = await prisma.customerLoyaltyAccount.findFirst({
    where: {
      programId,
      referralCode,
    },
  });

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

  // Get program for referral bonus
  const program = await prisma.loyaltyProgram.findUnique({
    where: { id: programId },
  });

  const referralBonus = program?.referralBonus || 0;

  // Create referee account
  const refereeReferralCode = `${contact.name?.substring(0, 4) || contact.phone?.substring(0, 4) || "REF"}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const referee = await prisma.customerLoyaltyAccount.create({
    data: {
      programId,
      contactId: refereeContactId,
      referralCode: refereeReferralCode,
      currentPoints: program?.signupBonus || 0,
      lifetimePoints: program?.signupBonus || 0,
    },
  });

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

  // Award referral bonus to referrer if configured
  if (referralBonus > 0) {
    await prisma.customerLoyaltyAccount.update({
      where: { id: referrer.id },
      data: {
        currentPoints: {
          increment: referralBonus,
        },
        lifetimePoints: {
          increment: referralBonus,
        },
      },
    });

    // Create transaction for referrer
    await prisma.loyaltyTransaction.create({
      data: {
        accountId: referrer.id,
        programId,
        transactionType: "earn",
        source: "referral",
        points: referralBonus,
        balanceAfter: referrer.currentPoints + referralBonus,
        metadata: {
          referralId: referral.id,
          refereeContactId,
        },
      },
    });
  }

  return {
    referral,
    referrer,
    referee,
    bonusAwarded: referralBonus,
  };
}

export async function completeReferral(
  referralId: string,
  purchaseAmount: number,
) {
  const referral = await prisma.loyaltyReferral.findUnique({
    where: { id: referralId },
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

  // Mark as completed
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
