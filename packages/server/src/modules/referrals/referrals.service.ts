import { randomInt } from "node:crypto";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";

export async function createReferral(name: string, email: string) {
  const referralCode = await generateUniqueReferralCode(name);

  return await prisma.referral.create({
    data: {
      referral_code: referralCode,
      name: name,
      email: email,
      visit_count: 0,
      signup_count: 0,
    },
  });
}

export async function getAllReferrals() {
  return await prisma.referral.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

export class ReferralCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReferralCodeError";
  }
}

export async function deleteReferral(id: string) {
  const existing = await prisma.referral.findUnique({ where: { id } });
  if (existing) {
    log.info(
      {
        referralId: existing.id,
        referralCode: existing.referral_code,
        visitCount: existing.visit_count,
        signupCount: existing.signup_count,
      },
      "Deleting a referral; recording its totals first",
    );
  }

  return await prisma.referral.deleteMany({
    where: { id },
  });
}

export async function updateReferral(code: string, type: "visit" | "signup") {
  const referral = await prisma.referral.findUnique({
    where: { referral_code: code },
  });

  if (!referral) {
    log.debug({ type }, "Referral code did not resolve; not counting");
    return null;
  }

  return await prisma.referral.update({
    where: { referral_code: code },
    data: {
      visit_count: type === "visit" ? { increment: 1 } : undefined,
      signup_count: type === "signup" ? { increment: 1 } : undefined,
    },
  });
}

const CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * randomInt rather than Math.random: the suffix is the whole secret of a code,
 * and 38.1 makes knowing a code the entire requirement for inflating it.
 * randomInt draws from the platform CSPRNG and, unlike `bytes % 36`, is unbiased.
 */
function randomSuffix(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  return out;
}

async function generateUniqueReferralCode(influencerName: string): Promise<string> {
  const base = influencerName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .substring(0, 15);

  for (let attempts = 0; attempts < 10; attempts++) {
    // Six characters of base 36 is ~2.1 billion per name, against the three
    // digits (900 values) that made a known influencer's code enumerable.
    const code = base ? `${base}${randomSuffix(6)}` : randomSuffix(12);
    const existing = await prisma.referral.findUnique({
      where: { referral_code: code },
    });
    if (!existing) {
      return code;
    }
  }

  throw new ReferralCodeError("Could not generate a unique referral code");
}
