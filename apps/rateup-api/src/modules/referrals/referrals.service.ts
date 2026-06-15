import prisma from "../../utils/prisma.js";

export async function createReferral(name: string) {
  const referralCode = await generateUniqueReferralCode(name);

  return await prisma.referral.create({
    data: {
      referral_code: referralCode,
      name: name,
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

export async function deleteReferral(id: string) {
  return await prisma.referral.delete({
    where: { id },
  });
}

export async function updateReferral(code: string, type: "visit" | "signup") {
  const referral = await prisma.referral.findUnique({
    where: { referral_code: code },
  });

  if (!referral) {
    throw new Error("Referral not found");
  }

  return await prisma.referral.update({
    where: { referral_code: code },
    data: {
      visit_count: type === "visit" ? { increment: 1 } : undefined,
      signup_count: type === "signup" ? { increment: 1 } : undefined,
    },
  });
}

async function generateUniqueReferralCode(
  influencerName: string,
): Promise<string> {
  const base = influencerName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .substring(0, 15);

  if (!base) {
    return Math.random().toString(36).substring(2, 9);
  }

  let attempts = 0;
  while (attempts < 10) {
    const randomSuffix = Math.floor(100 + Math.random() * 900); // 3 digit suffix
    const code = `${base}${randomSuffix}`;
    const existing = await prisma.referral.findUnique({
      where: { referral_code: code },
    });
    if (!existing) {
      return code;
    }
    attempts++;
  }
  return Math.random().toString(36).substring(2, 9);
}
