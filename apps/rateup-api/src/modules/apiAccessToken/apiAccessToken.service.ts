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
  return (await authenticateApiAccessToken(orgId, accessToken)) !== null;
}

/**
 * The key's grant when it matches, null otherwise. `scopes` is empty for a key issued
 * before scopes existed, which the actor reads as every permission.
 */
export async function authenticateApiAccessToken(
  orgId: string,
  accessToken: string,
): Promise<{ scopes: string[] } | null> {
  const row = await prisma.apiAccessToken.findUnique({
    where: { orgId },
    select: { accessToken: true, scopes: true },
  });
  if (!row) return null;
  const matches = await bcrypt.compare(accessToken, row.accessToken);
  return matches ? { scopes: row.scopes } : null;
}

export async function getApiKeyScopes(orgId: string): Promise<string[] | null> {
  const row = await prisma.apiAccessToken.findUnique({
    where: { orgId },
    select: { scopes: true },
  });
  return row?.scopes ?? null;
}

export async function setApiKeyScopes(orgId: string, scopes: string[]) {
  return prisma.apiAccessToken.update({ where: { orgId }, data: { scopes } });
}
