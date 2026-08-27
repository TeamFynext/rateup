import prisma from "../../utils/prisma.js";
import axios from "axios";
import { log } from "../../utils/logger.js";
import { isExpoPushToken } from "./mobile.schema.js";

export async function addToken(expoToken: string, userId: string, orgId: string) {
  if (!expoToken || !userId || !orgId) {
    throw new Error("Missing expoToken or userId or orgId");
  }

  // Upsert rather than findFirst-then-create: the app now re-registers on every
  // foreground, so this is called far more often than it was, and the old
  // read-then-write let two concurrent calls both miss and both insert. The
  // no-op `update` is what makes a repeat registration idempotent.
  return await prisma.expoPushToken.upsert({
    where: {
      expo_token_user_org_unique: { expoToken, userId, orgId },
    },
    create: {
      expoToken,
      user: { connect: { id: userId } },
      org: { connect: { id: orgId } },
    },
    update: {},
  });
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

/**
 * The devices that should be told about new activity on a contact.
 *
 * Assignment is the audience: `WaInboxAssign` rows are deleted on unassign, so a
 * row means "currently handling this contact", and it is the same source the app
 * uses to decide who may reply — so nobody is notified about a conversation they
 * cannot answer.
 *
 * Falls back to the whole org when nobody is assigned. An unassigned contact is
 * usually a *new* customer, and that first message is the one that must not be
 * missed; a silent queue nobody is watching is worse than a broad notification.
 */
export async function getTokensForContactAudience(
  orgId: string,
  contactId?: string | null,
): Promise<string[]> {
  if (!orgId) {
    throw new Error("Missing orgId");
  }

  if (!contactId) {
    return getTokensByOrgId(orgId);
  }

  const assignees = await prisma.waInboxAssign.findMany({
    where: { contactId },
    select: { assignedUserId: true },
  });

  if (assignees.length === 0) {
    return getTokensByOrgId(orgId);
  }

  const tokens = await prisma.expoPushToken.findMany({
    // Scoped by orgId as well as user: a token row is per (user, org), and an
    // assignee who also belongs to another org must not be pushed on that org's
    // device registration.
    where: { orgId, userId: { in: assignees.map((a) => a.assignedUserId) } },
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

// Defaulted rather than required. This is Expo's public endpoint, identical for
// every deployment, so making it mandatory config bought nothing and cost a
// silent failure mode: an unset variable disabled every push while the logs
// looked healthy. The variable remains an override so a mock server can stand in.
const EXPO_PUSH_URL_FALLBACK = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS_URL_FALLBACK = "https://exp.host/--/api/v2/push/getReceipts";

export const expoPushUrl = process.env.EXPO_PUSH_URL || EXPO_PUSH_URL_FALLBACK;

/**
 * Receipts live next to sends on the same host, so a mock or proxy configured
 * through `EXPO_PUSH_URL` is followed here too instead of silently reverting to
 * the real Expo service.
 */
export const expoReceiptsUrl =
  process.env.EXPO_PUSH_RECEIPTS_URL ||
  (expoPushUrl.endsWith("/send")
    ? `${expoPushUrl.slice(0, -"/send".length)}/getReceipts`
    : EXPO_RECEIPTS_URL_FALLBACK);

const EXPO_BATCH_SIZE = 100;

// Expo accepts up to 1000 receipt ids per request; kept well under so a single
// failed request costs less on retry.
const EXPO_RECEIPT_BATCH_SIZE = 300;

/**
 * Errors that mean the push credentials themselves are wrong — not this message,
 * not this device. They surface almost exclusively in receipts, which is why
 * nothing in this system could previously detect them: a broken FCM key looked
 * like clean logs and total silence on every Android device.
 */
const CREDENTIAL_ERRORS = new Set(["MismatchSenderId", "InvalidCredentials"]);

interface ExpoTicket {
  status?: string;
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoReceipt {
  status?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Remove tokens Expo has told us no longer exist.
 */
async function pruneStaleTokens(stale: string[], reason: string) {
  if (stale.length === 0) return;
  const removed = await prisma.expoPushToken.deleteMany({
    where: { expoToken: { in: stale } },
  });
  log.warn({ count: removed.count, reason }, "Removed Expo tokens reported as unregistered");
}

/**
 * Deliver a push and report back the tickets Expo accepted.
 *
 * The returned map is ticket id → token. Expo answers a send with a *ticket*,
 * which only says the message was queued; whether it actually reached the device
 * is reported later in a *receipt*, fetched by ticket id. The caller schedules
 * that second pass — see `checkPushReceipts`.
 */
export async function sendPushNotification(
  expoPushTokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<Record<string, string>> {
  if (!Array.isArray(expoPushTokens) || expoPushTokens.length === 0) {
    log.warn("No Expo push tokens provided");
    return {};
  }

  const validTokens = expoPushTokens.filter(isExpoPushToken);

  if (validTokens.length === 0) {
    log.warn("No valid Expo tokens");
    return {};
  }

  const stale: string[] = [];
  const tokensByTicketId: Record<string, string> = {};

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
      const token = batch[index];
      if (ticket?.status === "error") {
        if (ticket.details?.error === "DeviceNotRegistered") {
          stale.push(token);
        } else {
          log.error(
            { token, message: ticket.message, details: ticket.details },
            "Expo push failed",
          );
        }
        return;
      }
      // Remembered against its token so a receipt, which carries only the ticket
      // id, can be traced back to the device it concerns.
      if (ticket?.id) tokensByTicketId[ticket.id] = token;
    });
  }

  await pruneStaleTokens(stale, "ticket");

  return tokensByTicketId;
}

/**
 * Second half of a send: ask Expo what actually happened to each queued message.
 *
 * A ticket only means Expo accepted the message. Real delivery outcomes —
 * including most `DeviceNotRegistered` results, and every credential failure —
 * appear only here, some minutes later. Checking tickets alone (all this system
 * used to do) therefore under-reports dead tokens and cannot see a broken FCM or
 * APNs key at all: pushes would simply vanish with nothing logged.
 *
 * Ids Expo has no answer for yet are absent from the response and are skipped
 * rather than retried; the next send produces new tickets, so nothing is lost
 * permanently by missing one.
 */
export async function checkPushReceipts(tokensByTicketId: Record<string, string>) {
  const ticketIds = Object.keys(tokensByTicketId);
  if (ticketIds.length === 0) return;

  const stale: string[] = [];

  for (let i = 0; i < ticketIds.length; i += EXPO_RECEIPT_BATCH_SIZE) {
    const batch = ticketIds.slice(i, i + EXPO_RECEIPT_BATCH_SIZE);

    // Errors propagate for the same reason as in the send: the caller is a
    // BullMQ processor, and a network blip should be retried rather than
    // recorded as a clean check.
    const response = await axios.post<{ data?: Record<string, ExpoReceipt> }>(
      expoReceiptsUrl,
      { ids: batch },
      { headers: { "Content-Type": "application/json" } },
    );

    const receipts = response.data?.data ?? {};

    for (const [ticketId, receipt] of Object.entries(receipts)) {
      if (receipt?.status !== "error") continue;

      const token = tokensByTicketId[ticketId];
      const error = receipt.details?.error;

      if (error === "DeviceNotRegistered") {
        stale.push(token);
      } else if (error && CREDENTIAL_ERRORS.has(error)) {
        // Deliberately separated from the generic failure below: this one is not
        // about a device, it means every push to that platform is failing and a
        // human has to go and fix the credentials.
        log.error(
          { error, message: receipt.message },
          "Expo rejected the push credentials — no notifications are reaching this platform",
        );
      } else {
        log.error(
          { token, error, message: receipt.message },
          "Expo push receipt reported a failure",
        );
      }
    }
  }

  await pruneStaleTokens(stale, "receipt");
}
