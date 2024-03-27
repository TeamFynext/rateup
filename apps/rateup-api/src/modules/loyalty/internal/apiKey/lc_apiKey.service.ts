import bcrypt from "bcrypt";
import prisma from "../../../../utils/prisma";
import { generateRandomAlphaId } from "../../../../utils/misc/random.utils";

export async function generateApiKey() {
  const randomKey = generateRandomAlphaId(128);

  // will saltRounds=8 bottleneck the performance?
  // For each api request we will hash the key
  const hash = await bcrypt.hash(randomKey, 8);
  return { key: randomKey, hash };
}

/**
 * Returns plainText apiKey & saves hashed key in db
 * */
export async function createApiKey(orgId: string) {
  const { key, hash } = await generateApiKey();
  await prisma.loyaltyApiKey.create({
    data: {
      apiKey: hash,
      orgId,
    },
  });
  return key;
}

export async function deleteApiKey(orgId: string) {
  const res = await prisma.loyaltyApiKey.delete({
    where: {
      orgId,
    },
  });
  return res;
}

/**
 * Used to check if the apiKey exists & returns createdAt
 */
export async function getApiKeyCreatedAt(orgId: string) {
  const apiKey = await prisma.loyaltyApiKey.findUnique({
    where: {
      orgId,
    },
    select: {
      createdAt: true,
    },
  });
  return apiKey?.createdAt;
}

export async function regenerateApiKey(orgId: string) {
  await deleteApiKey(orgId);
  return await createApiKey(orgId);
}

export async function verifyLoyaltyApiKey(orgId: string, apiKey: string) {
  const apiKeyHash = await prisma.loyaltyApiKey.findUnique({
    where: {
      orgId,
    },
  });

  if (!apiKeyHash) {
    return false;
  }
  return await bcrypt.compare(apiKey, apiKeyHash.apiKey);
}
