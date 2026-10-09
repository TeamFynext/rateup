import prisma from "../../utils/prisma.js";
import axios from "axios";
import { log } from "../../utils/logger.js";
import { isExpoPushToken } from "./mobile.schema.js";

export async function addToken(
  expoToken: string,
  userId: string,
  orgId: string,
  platform?: "ios" | "android",
) {
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
      platform,
      user: { connect: { id: userId } },
      org: { connect: { id: orgId } },
    },
    // Fills the platform in for a device registered before the app sent it.
    update: platform ? { platform } : {},
  });
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
/**
 * How a push is delivered, beyond its words. Everything here is optional and maps straight
 * onto Expo's message fields; omitted means Expo's defaults (the default sound, the app's
 * default Android channel, no expiry).
 */
export interface PushDelivery {
  /** iOS: a sound file bundled in the app, e.g. `"wa_call_ringtone.wav"`. */
  sound?: string;
  /** Android: the notification channel, which decides the sound and heads-up behaviour. */
  channelId?: string;
  priority?: "default" | "normal" | "high";
  /** Seconds Expo and the platforms keep trying before dropping the push. */
  ttl?: number;
  /** iOS 15+: `time-sensitive` breaks through Focus modes. */
  interruptionLevel?: "active" | "critical" | "passive" | "time-sensitive";
  /**
   * Android: send `data` alone, with no title, body or sound. FCM then hands it to the app
   * instead of drawing a notification — and wakes a closed app to run its background task,
   * which is how a call rings full-screen on a locked phone. `title`/`body` are ignored.
   */
  dataOnly?: boolean;
}

export async function sendPushNotification(
  expoPushTokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  delivery: PushDelivery = {},
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
    const { dataOnly, ...fields } = delivery;
    const messages = batch.map((token) =>
      dataOnly
        ? { to: token, data, ...fields }
        : { to: token, sound: "default", title, body, data, ...fields },
    );

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

/** Register this device's PushKit token (iOS), so a call can ring it while the app is closed. */
export async function addVoipToken(token: string, userId: string, orgId: string) {
  return prisma.voipPushToken.upsert({
    where: { token_userId_orgId: { token, userId, orgId } },
    create: { token, userId, orgId },
    update: {},
  });
}

export async function deleteVoipToken(token: string, userId: string) {
  return prisma.voipPushToken.deleteMany({ where: { token, userId } });
}
