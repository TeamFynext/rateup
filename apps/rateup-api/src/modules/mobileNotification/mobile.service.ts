import prisma from "../../utils/prisma.js";
import axios from "axios";
import { log } from "../../utils/logger.js";
import { isExpoPushToken } from "./mobile.schema.js";

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

export async function getTokensByUserId(userId: string, orgId: string): Promise<string[]> {
  if (!userId || !orgId) {
    throw new Error("Missing userId or orgId");
  }

  const tokens = await prisma.expoPushToken.findMany({
    where: { userId, orgId },
    select: { expoToken: true },
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

const EXPO_BATCH_SIZE = 100;

interface ExpoTicket {
  status?: string;
  message?: string;
  details?: { error?: string };
}

export async function sendPushNotification(
  expoPushTokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown> = {},
) {
  if (!Array.isArray(expoPushTokens) || expoPushTokens.length === 0) {
    log.warn("No Expo push tokens provided");
    return;
  }

  const validTokens = expoPushTokens.filter(isExpoPushToken);

  if (validTokens.length === 0) {
    log.warn("No valid Expo tokens");
    return;
  }

  if (!expoPushUrl) {
    // Left as a refusal rather than a throw: this is configuration, and it is
    // the same for every call, so failing every queued notification job would
    // only fill the retry queue. It is loud in the log instead.
    log.error("EXPO_PUSH_URL environment variable is not set; skipping push notification");
    return;
  }

  const stale: string[] = [];

  for (let i = 0; i < validTokens.length; i += EXPO_BATCH_SIZE) {
    const batch = validTokens.slice(i, i + EXPO_BATCH_SIZE);
    const messages = batch.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      data,
    }));

    // No try/catch: a transport failure used to be swallowed with a
    // console.error, so no caller could tell a delivered push from an
    // undelivered one. The only caller is a BullMQ processor, which is where a
    // retry belongs.
    const response = await axios.post<{ data?: ExpoTicket[] }>(expoPushUrl, messages, {
      headers: { "Content-Type": "application/json" },
    });

    // Expo reports per-message failures in the body of a 200, which nothing
    // read — so DeviceNotRegistered, the way a stale token is meant to be
    // pruned, was never seen and dead tokens were pushed to forever.
    const tickets = Array.isArray(response.data?.data) ? response.data.data : [];
    tickets.forEach((ticket, index) => {
      if (ticket?.status !== "error") return;
      const token = batch[index];
      if (ticket.details?.error === "DeviceNotRegistered") {
        stale.push(token);
      } else {
        log.error({ token, message: ticket.message, details: ticket.details }, "Expo push failed");
      }
    });
  }

  if (stale.length > 0) {
    const removed = await prisma.expoPushToken.deleteMany({
      where: { expoToken: { in: stale } },
    });
    log.warn({ count: removed.count }, "Removed Expo tokens reported as unregistered");
  }
}
