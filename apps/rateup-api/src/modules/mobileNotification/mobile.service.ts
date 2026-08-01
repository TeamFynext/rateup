import prisma from "../../utils/prisma.js";
import axios from "axios";

export async function addToken(expoToken: string, userId: string, orgId: string) {
  if (!expoToken || !userId || !orgId) {
    throw new Error("Missing expoToken or userId or orgId");
  }

  // if already exixt
  const existing = await prisma.expoPushToken.findFirst({
    where: {
      expoToken,
      userId,
      orgId,
    },
  });

  if (existing) {
    return existing;
  }

  const newToken = await prisma.expoPushToken.create({
    data: {
      expoToken,
      user: {
        connect: { id: userId },
      },
      org: {
        connect: { id: orgId },
      },
    },
  });

  return newToken;
}

export async function getTokensByOrgId(orgId: string): Promise<string[]> {
  if (!orgId) {
    throw new Error("Missing orgId");
  }

  const tokens = await prisma.expoPushToken.findMany({
    where: { orgId },
    select: {
      expoToken: true,
    },
  });
  return tokens.map((token) => token.expoToken);
}

export async function deleteTokenByUserId(userId: string, expoToken: string) {
  if (!userId || !expoToken) {
    throw new Error("Missing userId or ExpoToken");
  }
  const token = await prisma.expoPushToken.deleteMany({
    where: {
      userId,
      expoToken,
    },
  });
  return token;
}

const expoPushUrl = process.env.EXPO_PUSH_URL;

export async function sendPushNotification(
  expoPushTokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown> = {},
) {
  if (!Array.isArray(expoPushTokens) || expoPushTokens.length === 0) {
    console.error("No Expo push tokens provided");
    return;
  }

  // Filter invalid tokens
  const validTokens = expoPushTokens.filter(
    (token) => typeof token === "string" && token.startsWith("ExponentPushToken"),
  );

  if (validTokens.length === 0) {
    console.error("No valid Expo tokens");
    return;
  }

  if (!expoPushUrl) {
    console.error("EXPO_PUSH_URL environment variable is not set; skipping push notification");
    return;
  }

  const messages = validTokens.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
    data,
  }));

  try {
    await axios.post(expoPushUrl, messages, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending push notifications:", error);
  }
}
