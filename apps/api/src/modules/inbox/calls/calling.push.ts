import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import redis from "../../../utils/redisConnection.js";
import { sendVoipPush, voipPushConfigured } from "../../settings/mobileNotifications/apns.js";
import { sendPushNotification } from "../../settings/mobileNotifications/mobile.service.js";

/**
 * The mobile app's ringing channel and sound. Both are bundled into the app build
 * (rateup-app: app.json's expo-notifications `sounds`, and the channel it creates), so
 * renaming either here needs a matching app release.
 */
export const CALL_PUSH_CHANNEL = "wa_calls";
export const CALL_PUSH_SOUND = "wa_call_ringtone.wav";
/**
 * Meta gives up on an unanswered call after 30–60 s. A push delivered later than that
 * would ring for a call that is already gone, so it is dropped instead.
 */
const CALL_PUSH_TTL_SECONDS = 45;

interface IncomingCallPush {
  orgId: string;
  callId: string;
  contactId: string | null;
  callerName: string;
  /** The customer's number, shown by CallKit as the caller. */
  handle: string;
  userIds: string[];
}

/**
 * Ring the phones of the people who can answer this call — the WebSocket already rings an
 * open app; this reaches one in the background or not running at all. Per platform:
 *
 * - Android: a data-only push. It wakes even a closed app, whose background task shows a
 *   full-screen incoming call over the lock screen.
 * - iOS with a VoIP token (and APNs configured): a PushKit push, which wakes the app
 *   straight into CallKit's own incoming-call screen.
 * - iOS without one, and devices registered before the app reported its platform: the
 *   plain notification with the ringtone, as before.
 *
 * Best-effort — a push failure must never stop the call ringing elsewhere.
 */
export async function pushIncomingCall(input: IncomingCallPush): Promise<void> {
  if (input.userIds.length === 0) return;
  try {
    const [rows, voip] = await Promise.all([
      prisma.expoPushToken.findMany({
        where: { orgId: input.orgId, userId: { in: input.userIds } },
        select: { expoToken: true, platform: true, userId: true },
      }),
      voipPushConfigured()
        ? prisma.voipPushToken.findMany({
            where: { orgId: input.orgId, userId: { in: input.userIds } },
            select: { token: true, userId: true },
          })
        : Promise.resolve([]),
    ]);
    const data = {
      type: "wa_call",
      callId: input.callId,
      contactId: input.contactId,
      callerName: input.callerName,
    };
    // A user CallKit already rings needs no second, ordinary notification on that phone.
    const ringsByVoip = new Set(voip.map((row) => row.userId));

    const android = rows.filter((row) => row.platform === "android").map((row) => row.expoToken);
    const visible = rows
      .filter(
        (row) =>
          row.platform !== "android" && !(row.platform === "ios" && ringsByVoip.has(row.userId)),
      )
      .map((row) => row.expoToken);

    await Promise.all([
      android.length > 0
        ? sendPushNotification(android, "", "", data, {
            dataOnly: true,
            priority: "high",
            ttl: CALL_PUSH_TTL_SECONDS,
          })
        : null,
      visible.length > 0
        ? sendPushNotification(visible, "Incoming WhatsApp call", input.callerName, data, {
            sound: CALL_PUSH_SOUND,
            channelId: CALL_PUSH_CHANNEL,
            priority: "high",
            ttl: CALL_PUSH_TTL_SECONDS,
            interruptionLevel: "time-sensitive",
          })
        : null,
      sendVoipPush(
        voip.map((row) => row.token),
        // `uuid` is the call's own id: CallKit needs a UUID, and the app maps it back.
        { uuid: input.callId, handle: input.handle, ...data },
        CALL_PUSH_TTL_SECONDS,
      ),
    ]);
  } catch (error) {
    log.error({ err: error, callId: input.callId }, "Could not push an incoming call");
  }
}

/**
 * Stop the full-screen ring on Android phones once the call no longer rings — answered by
 * someone, declined, or given up. An app woken by the ring push has no socket to hear it
 * on, so it gets its own push. Sent once per call.
 *
 * iOS needs none: the VoIP push launched the app, so it is running and hears the socket.
 */
export async function pushCallStoppedRinging(input: {
  orgId: string;
  callId: string;
  userIds: string[];
}): Promise<void> {
  if (input.userIds.length === 0) return;
  try {
    const first = await redis.set(`wacall:ringstop:${input.callId}`, "1", "EX", 3600, "NX");
    if (first !== "OK") return;
    const rows = await prisma.expoPushToken.findMany({
      where: { orgId: input.orgId, userId: { in: input.userIds }, platform: "android" },
      select: { expoToken: true },
    });
    if (rows.length === 0) return;
    await sendPushNotification(
      rows.map((row) => row.expoToken),
      "",
      "",
      { type: "wa_call_stop", callId: input.callId },
      { dataOnly: true, priority: "high", ttl: CALL_PUSH_TTL_SECONDS },
    );
  } catch (error) {
    log.error({ err: error, callId: input.callId }, "Could not push a stopped ring");
  }
}
