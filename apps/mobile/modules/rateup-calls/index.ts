import { requireOptionalNativeModule, type EventSubscription } from "expo";
import { logger } from "../../src/utils/logger";

/**
 * Android call plumbing (modules/rateup-calls/android): the full-screen incoming-call
 * notification, showing the app over the lock screen for a call, and the ongoing-call
 * foreground service. Absent on iOS — CallKit does that job — and on builds without the
 * module, so every function here is a no-op rather than a crash.
 */
export type CallLaunchAction = "answer" | "open" | "dismiss";

interface RateUpCallsNative {
  showIncomingCall(callId: string, callerName: string, number: string | null): boolean;
  cancelIncomingCall(callId: string): boolean;
  consumeLaunchAction(): { callId: string; action: CallLaunchAction } | null;
  setShowOverLockScreen(enabled: boolean): boolean;
  startOngoingCall(title: string, text: string): boolean;
  stopOngoingCall(): boolean;
  addListener(
    event: "onCallAction",
    listener: (event: { callId: string; action: CallLaunchAction }) => void,
  ): EventSubscription;
}

const native = requireOptionalNativeModule<RateUpCallsNative>("RateUpCalls");

export const nativeCallsAvailable = native !== null;

function safely<T>(run: () => T, fallback: T): T {
  try {
    return run();
  } catch (error) {
    logger.warn("RateUpCalls:", error);
    return fallback;
  }
}

export function showIncomingCall(callId: string, callerName: string, number: string | null) {
  return safely(() => native?.showIncomingCall(callId, callerName, number) ?? false, false);
}

export function cancelIncomingCall(callId: string) {
  safely(() => native?.cancelIncomingCall(callId), false);
}

export function consumeLaunchAction() {
  return safely(() => native?.consumeLaunchAction() ?? null, null);
}

export function setShowOverLockScreen(enabled: boolean) {
  safely(() => native?.setShowOverLockScreen(enabled), false);
}

export function startOngoingCall(title: string, text: string) {
  safely(() => native?.startOngoingCall(title, text), false);
}

export function stopOngoingCall() {
  safely(() => native?.stopOngoingCall(), false);
}

export function addCallActionListener(
  listener: (event: { callId: string; action: CallLaunchAction }) => void,
): { remove(): void } {
  return native?.addListener("onCallAction", listener) ?? { remove() {} };
}
