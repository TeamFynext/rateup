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
      created_at: "desc",
    },
  });
}

/** Raised when the generator cannot find a free code. See issues.txt 38.2. */
export class ReferralCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReferralCodeError";
  }
}

export async function deleteReferral(id: string) {
  // The totals go with the row and there is no archive table, so removing an
  // influencer destroys the record of what they were owed. Logging them is not a
  // substitute for archiving — see the Status note on issues.txt 38.6 — but it
  // leaves something behind that an operator can recover from.
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

  // deleteMany, not delete: `delete` raises P2025 for a row that is not there and
  // the handler's catch answered a fixed 500, so a double-click in the admin UI
  // reported a fault for an operation that had already succeeded.
  // See issues.txt 38.6.
  return await prisma.referral.deleteMany({
    where: { id },
  });
}

/**
 * Increments one of the two counters, or does nothing when the code is unknown.
 *
 * This used to THROW "Referral not found" for a miss, and the track-visit handler
 * mapped that message to a 404 — so the unauthenticated endpoint distinguished a
 * live code from an invented one and the code space was enumerable. It returns
 * null instead, and the handler answers the same 200 either way.
 * See issues.txt 38.5.
 */
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

/**
 * Two paths used to leave the retry loop WITHOUT checking the result against the
 * database: an empty base (a name with no alphanumerics) returned immediately,
 * and ten consecutive collisions returned the same expression. Both returned
 * `Math.random().toString(36).substring(2, 9)`, whose length is whatever the draw
 * happens to give — seven characters typically, one for 0.5, and an EMPTY STRING
 * for a draw of exactly 0. Every candidate is checked now, including the one used
 * when there is no usable base, and exhausting the attempts raises rather than
 * writing an unchecked code. See issues.txt 38.2.
 */
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
