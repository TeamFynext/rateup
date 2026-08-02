import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import prisma from "../../utils/prisma.js";

/**
 * 32 bytes of CSPRNG output, base64url-encoded — 43 characters carrying a full
 * 256 bits.
 *
 * Two things were wrong with the 128-character alphabetic key this replaces.
 * It was drawn from Math.random one character at a time, so its real ceiling
 * was V8's 128 bits of generator state rather than the ~730 bits its length
 * suggested, and that state is approachable from output an attacker can see
 * (issues.txt 46.1). And bcrypt hashes at most 72 bytes and silently discards
 * the rest, so 56 of those 128 characters never participated in the hash or the
 * comparison — the last third of what an operator copied and stored was
 * decoration (issues.txt 46.3). A 43-character key is comfortably inside
 * bcrypt's window, so every character of it is checked.
 *
 * Keys minted before this change keep working: bcrypt.compare truncates the
 * presented key the same way it truncated the stored one.
 */
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
    // orgId is @unique, so a second create raised P2002 and the handler had no
    // catch — pressing "create" twice answered "something went wrong" rather
    // than saying a key already exists and that regenerate is the action that
    // replaces it. See issues.txt 46.9.
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

/**
 * Was `await deleteApiKey(orgId); return await createApiKey(orgId);` — two
 * statements with no transaction and nothing to roll back, so a create that
 * failed after the delete committed left the organisation with no key at all,
 * every integration failing, and a caller whose error message gave no hint that
 * their old key was already gone. The obvious retry could not work either:
 * regenerate began with a delete that then raised P2025 against the missing
 * row, which is also why it could never be used to mint a first key.
 *
 * An upsert is one statement: the row either gains the new hash or is created
 * with it. See issues.txt 46.6.
 */
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
