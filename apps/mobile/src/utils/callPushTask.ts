import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

import { cancelIncomingCall, showIncomingCall } from "../../modules/rateup-calls";
import { logger } from "@/utils/logger";

/**
 * Android: the data-only push the API sends for an incoming call (and when it stops
 * ringing) runs this task — with the app in the background, or not running at all, in
 * which case Android starts the JS bundle just for it. It shows the full-screen call over
 * the lock screen; tapping Answer opens the app on the call.
 *
 * Defined in the module scope of the app entry (index.ts), as expo-task-manager requires:
 * a task defined later is not there when a push wakes a closed app.
 */
export const CALL_PUSH_TASK = "rateup-call-push";

interface CallPush {
  type: "wa_call" | "wa_call_stop";
  callId: string;
  callerName?: string;
}

/** Expo delivers the push's `data` as a JSON string (`dataString`, or `body` on older paths). */
function readCallPush(payload: unknown): CallPush | null {
  const data = (payload as { data?: Record<string, unknown> } | null)?.data;
  if (!data) return null;
  let fields: Record<string, unknown> = data;
  for (const key of ["dataString", "body"]) {
    const raw = data[key];
    if (typeof raw === "string") {
      try {
        fields = JSON.parse(raw) as Record<string, unknown>;
        break;
      } catch {
        // Not JSON; try the next spelling.
      }
    }
  }
  const { type, callId, callerName } = fields;
  if ((type !== "wa_call" && type !== "wa_call_stop") || typeof callId !== "string") return null;
  return { type, callId, callerName: typeof callerName === "string" ? callerName : undefined };
}

if (Platform.OS === "android") {
  TaskManager.defineTask(CALL_PUSH_TASK, async ({ data, error }) => {
    if (error) return;
    const push = readCallPush(data);
    if (!push) return;
    if (push.type === "wa_call_stop") {
      cancelIncomingCall(push.callId);
      return;
    }
    // An open app already rings on its own call screen through the socket.
    if (AppState.currentState === "active") return;
    showIncomingCall(push.callId, push.callerName ?? "WhatsApp call", null);
  });

  Notifications.registerTaskAsync(CALL_PUSH_TASK).catch((err) =>
    logger.warn("Could not register the call push task", err),
  );
}
