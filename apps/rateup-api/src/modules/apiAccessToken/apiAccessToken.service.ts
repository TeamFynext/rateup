import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import prisma from "../../utils/prisma.js";

export async function generateApiKey() {
  const randomKey = randomBytes(32).toString("base64url");

  // will saltRounds=8 bottleneck the performance?
  // For each api request we will hash the key
  const hash = await bcrypt.hash(randomKey, 5);
  return { key: randomKey, hash };
}

/** Thrown when an org that already has a key asks for another. */
export class ApiKeyAlreadyExistsError extends Error {
  constructor() {
    super("This organization already has an API key");
    this.name = "ApiKeyAlreadyExistsError";
  }
}

/**
 * Returns plainText apiKey & saves hashed key in db
 * */
export async function createApiKey(orgId: string) {
  const { key, hash } = await generateApiKey();
  try {
    await prisma.apiAccessToken.create({
      data: {
        accessToken: hash,
        orgId,
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && (error as { code?: string }).code === "P2002") {
      throw new ApiKeyAlreadyExistsError();
    }
    throw error;
  }
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
  const { key, hash } = await generateApiKey();
  await prisma.apiAccessToken.upsert({
    where: { orgId },
    create: { accessToken: hash, orgId },
    update: { accessToken: hash, createdAt: new Date() },
  });
  return key;
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
