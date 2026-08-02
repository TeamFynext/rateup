import prisma from "../../../utils/prisma.js";
import { createCustomerAccount, findAccountByReferralCode } from "../accounts/account.service.js";

/**
 * Opens the referee's account and records the referral.
 *
 * The account itself is opened by createCustomerAccount. This function used to do
 * it inline, and had drifted into a THIRD account-creation path that disagreed
 * with the other two on nearly every point:
 *
 *   - It paid the referrer TWICE. createCustomerAccount guards the points credit
 *     with `referralBonusType === "points"`; here the gift branch and the points
 *     branch were two independent `if`s, so a program configured for a gift bonus
 *     that also carried a non-zero `referralBonus` number paid the gift AND the
 *     points, every time.
 *   - It never set `referredById`, so the referee's own row did not record who
 *     referred them and anything reading the account rather than the
 *     LoyaltyReferral table saw no referrer.
 *   - It never set `currentTierId`, so the referee started untiered — which opened
 *     the tier bypass of issues.txt 20.6.
 *   - It minted its own referral-code format, un-upper-cased, so codes from here
 *     read "Bobb-4RI82" while signup codes read "BOBBY-AB12", against a lookup
 *     that was an exact case-sensitive match.
 *
 * All four followed from it being a second implementation of one operation rather
 * than from any of them being decided. See issues.txt 20.40.
 */
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

/**
 * Marks a referral completed.
 *
 * It awards nothing, and the signature no longer promises that it does. The whole
 * bonus — both sides of it — is paid at trackReferral time, so the
 * pending -> completed lifecycle has no financial meaning: a referral that never
 * completes has already paid out in full, and anything reading the status as "has
 * this referral been earned" is reading it wrong. The purchase amount used to be
 * accepted, named `_purchaseAmount`, and never read.
 *
 * Paying on completion instead would be the other way to resolve this, and it is
 * the better design — but it moves when real money is credited, which is a product
 * decision rather than a correction. Recorded as such in issues.txt 20.41; what is
 * fixed here is the signature that lied about it and the missing org scope.
 */
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
