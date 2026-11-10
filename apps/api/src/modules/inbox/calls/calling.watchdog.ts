import { WaCallDirection, WaCallStatus, type WaCall } from "../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import redis from "../../../utils/redisConnection.js";
import { getWaSettingsByPhoneId } from "../../meta/whatsapp/settings/settings.service.js";
import { callMetaApi } from "../../meta/whatsapp/wa_axios.js";

/**
 * A call's audio lives in one browser tab. When that tab reloads, closes or crashes, the
 * peer connection is gone for good — WhatsApp has no way to resume it — but Meta keeps the
 * call open and the customer sits on a silent line until it times out.
 *
 * So the tab holding a call proves it is still there: it heartbeats every few seconds,
 * each beat refreshing a short-lived Redis key, and a delayed job keeps checking that key.
 * When the beats stop, the job hangs up on Meta's side. The tab also sends a terminate as
 * it unloads, which is faster; this is what catches the cases where that never gets out.
 *
 * Kept apart from calling.service.ts because the bullmq worker runs it, and that module
 * pulls in the WebSocket controller, which a worker has no business loading.
 */

/** Long enough to ride out a couple of missed beats (the browser sends one every 5 s). */
export const CALL_ALIVE_TTL_SECONDS = 20;
/** How often the watchdog looks. A dead tab is hung up within TTL + this. */
export const CALL_WATCHDOG_INTERVAL_MS = 10_000;

const aliveKey = (callId: string) => `wacall:alive:${callId}`;

export async function markCallAlive(callId: string): Promise<void> {
  await redis.set(aliveKey(callId), "1", "EX", CALL_ALIVE_TTL_SECONDS);
}

/** Media is (or is about to be) flowing to a browser, so a missing tab matters. */
export function holdsBrowserMedia(call: Pick<WaCall, "status" | "direction" | "endedAt">) {
  if (call.endedAt) return false;
  if (call.status === WaCallStatus.ACCEPTED) return true;
  return (
    call.direction === WaCallDirection.BUSINESS_INITIATED && call.status === WaCallStatus.RINGING
  );
}

export async function terminateOnMeta(
  call: Pick<WaCall, "phoneId" | "waCallId">,
  accessToken: string,
) {
  await callMetaApi(`/${call.phoneId}/calls`, "POST", accessToken, {
    messaging_product: "whatsapp",
    call_id: call.waCallId,
    action: "terminate",
  });
}

export type WatchdogResult = "alive" | "gone" | "terminated";

/**
 * One watchdog look. `alive` means look again later; anything else ends the watch. The row
 * itself is finalised by the terminate webhook Meta sends back, exactly as for a hang-up.
 */
export async function checkCallAlive(callId: string): Promise<WatchdogResult> {
  const call = await prisma.waCall.findUnique({ where: { id: callId } });
  if (!call || !holdsBrowserMedia(call)) return "gone";
  if (await redis.exists(aliveKey(callId))) return "alive";

  const settings = await getWaSettingsByPhoneId(call.phoneId);
  if (!settings) return "gone";
  try {
    await terminateOnMeta(call, settings.accessToken);
    log.warn({ callId, waCallId: call.waCallId }, "Hung up a call whose browser went away");
  } catch (error) {
    // Most often the call had already ended and the webhook has not landed yet.
    log.warn({ err: error, callId }, "Could not hang up an abandoned call");
  }
  return "terminated";
}
