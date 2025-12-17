import bcrypt from "bcrypt";
import prisma from "../../utils/prisma.js";
import { generateRandomAlphaId } from "../../utils/misc/random.utils.js";

export async function generateApiKey() {
  const randomKey = generateRandomAlphaId(128);

  // will saltRounds=8 bottleneck the performance?
  // For each api request we will hash the key
  const hash = await bcrypt.hash(randomKey, 5);
  return { key: randomKey, hash };
}

/**
 * Returns plainText apiKey & saves hashed key in db
 * */
export async function createApiKey(orgId: string) {
  const { key, hash } = await generateApiKey();
  await prisma.apiAccessToken.create({
    data: {
      accessToken: hash,
      orgId,
    },
  });
  return key;
}

export async function deleteApiKey(orgId: string) {
  const res = await prisma.apiAccessToken.delete({
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
  const apiKey = await prisma.apiAccessToken.findUnique({
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

export async function verifyApiAccessToken(orgId: string, accessToken: string) {
  const apiKeyHash = await prisma.apiAccessToken.findUnique({
    where: {
      orgId,
    },
  });

  if (!apiKeyHash) {
    return false;
  }
  return await bcrypt.compare(accessToken, apiKeyHash.accessToken);
}
