import { useEffect } from "react";
import { AppState, Platform } from "react-native";

import { addVoipToken } from "@/api/notification";
import { callErrorMessage, getRingingCalls } from "@/api/whatsapp/calling";
import { Toast } from "@/components/common/Notice";
import {
  answer,
  dismissRinging,
  hangUp,
  syncRingingCalls,
  toggleMute,
  useCallStore,
} from "@/store/callStore";

import {
  addCallActionListener,
  type CallLaunchAction,
  cancelIncomingCall,
  consumeLaunchAction,
  setShowOverLockScreen,
  startOngoingCall,
  stopOngoingCall,
} from "../../modules/rateup-calls";

/**
 * Connects the phone's own call surfaces to the call store:
 *
 * - Android (modules/rateup-calls): the full-screen notification that rings a locked or
 *   closed phone, showing the app over the lock screen while a call needs it, and the
 *   foreground service that keeps a live call going with the screen off.
 * - iOS: CallKit (react-native-callkeep) rung by PushKit VoIP pushes — set up natively by
 *   plugins/withIosCallKit.js — and the VoIP token the API needs to send them.
 *
 * Mounted once, by the call screen, inside the signed-in part of the app.
 */
export function useNativeCalls() {
  useEffect(() => {
    if (Platform.OS === "android") return startAndroid();
    if (Platform.OS === "ios") return startIos();
    return undefined;
  }, []);
}

/** Answer a call the phone's own UI was told about — the app may have just been launched. */
async function answerFromPhone(callId: string) {
  try {
    const calls = await getRingingCalls();
    syncRingingCalls(calls);
    if (!calls.some((call) => call.id === callId)) {
      Toast.info("That call is no longer ringing");
      return;
    }
    await answer(callId);
  } catch (error) {
    Toast.error(callErrorMessage(error, "Could not answer the call"));
  }
}

function displayName(name: string | null, number: string | null) {
  return name ?? (number ? `+${number}` : "a customer");
}

/* ----------------------------------------------------------------- Android */

function startAndroid(): () => void {
  const onAction = ({ callId, action }: { callId: string; action: CallLaunchAction }) => {
    if (action === "dismiss") {
      dismissRinging(callId);
    } else if (action === "answer") {
      void answerFromPhone(callId);
    } else {
      // "open": the call screen rings for it once the ringing list is synced.
      getRingingCalls()
        .then(syncRingingCalls)
        .catch(() => undefined);
    }
  };

  // Opened from the notification before JavaScript was running (a cold start).
  const launched = consumeLaunchAction();
  if (launched) onAction(launched);
  const subscription = addCallActionListener(onAction);

  // In the app, the call screen rings: the notification's own ringing stops.
  const silenceNotifications = () => {
    for (const call of useCallStore.getState().ringing) cancelIncomingCall(call.id);
  };
  const appState = AppState.addEventListener("change", (state) => {
    if (state === "active") silenceNotifications();
  });
  silenceNotifications();

  let overLockScreen: boolean | null = null;
  let ongoingFor: string | null = null;
  const unsubscribe = useCallStore.subscribe((state, previous) => {
    // Over the lock screen only while a call needs the screen; never otherwise, or a locked
    // phone would open straight into the app.
    const needsScreen = state.ringing.length > 0 || state.active !== null;
    if (needsScreen !== overLockScreen) {
      overLockScreen = needsScreen;
      setShowOverLockScreen(needsScreen);
    }

    const activeKey = state.active ? (state.active.call?.id ?? "dialling") : null;
    if (activeKey && !ongoingFor && state.active) {
      ongoingFor = activeKey;
      startOngoingCall(
        "WhatsApp call",
        `On a call with ${displayName(state.active.contactName, state.active.customerWaId)} · tap to return`,
      );
    } else if (!activeKey && ongoingFor) {
      ongoingFor = null;
      stopOngoingCall();
    }

    // A ring that stopped here (answered, dismissed, ended) stops on the notification too.
    const stillRinging = new Set(state.ringing.map((c) => c.id));
    for (const call of previous.ringing) {
      if (!stillRinging.has(call.id)) cancelIncomingCall(call.id);
    }
  });

  return () => {
    subscription.remove();
    appState.remove();
    unsubscribe();
  };
}

/* --------------------------------------------------------------------- iOS */

function startIos(): () => void {
  // iOS-only native modules: required here so Android never loads them.
  const RNCallKeep = (require("react-native-callkeep") as typeof import("react-native-callkeep"))
    .default;
  const VoipPush = (
    require("react-native-voip-push-notification") as typeof import("react-native-voip-push-notification")
  ).default;
  const { RTCAudioSession } =
    require("react-native-webrtc") as typeof import("react-native-webrtc");

  /** Calls CallKit is showing; CallKit's UUIDs come back lower-cased. */
  const inCallKit = new Set<string>();
  const id = (uuid: string) => uuid.toLowerCase();

  const registerToken = (token: string) => {
    if (token) addVoipToken(token).catch(() => undefined);
  };
  VoipPush.addEventListener("register", registerToken);
  VoipPush.addEventListener("didLoadWithEvents", (events) => {
    for (const event of events ?? []) {
      if (event.name === VoipPush.RNVoipPushRemoteNotificationsRegisteredEvent) {
        registerToken(event.data as string);
      }
    }
  });
  VoipPush.registerVoipToken();

  const onAnswer = ({ callUUID }: { callUUID: string }) => {
    inCallKit.add(id(callUUID));
    void answerFromPhone(id(callUUID));
  };
  const onEnd = ({ callUUID }: { callUUID: string }) => {
    const callId = id(callUUID);
    inCallKit.delete(callId);
    if (useCallStore.getState().active?.call?.id === callId) void hangUp();
    // Declined on this phone: stop ringing here, keep ringing teammates.
    else dismissRinging(callId);
  };

  const listeners = [
    RNCallKeep.addEventListener("didDisplayIncomingCall", ({ callUUID }) =>
      inCallKit.add(id(callUUID)),
    ),
    RNCallKeep.addEventListener("answerCall", onAnswer),
    RNCallKeep.addEventListener("endCall", onEnd),
    // CallKit owns the audio session; WebRTC only starts audio once CallKit hands it over.
    RNCallKeep.addEventListener("didActivateAudioSession", () =>
      RTCAudioSession.audioSessionDidActivate(),
    ),
    RNCallKeep.addEventListener("didDeactivateAudioSession", () =>
      RTCAudioSession.audioSessionDidDeactivate(),
    ),
    RNCallKeep.addEventListener("didPerformSetMutedCallAction", ({ muted }) => {
      const active = useCallStore.getState().active;
      if (active && active.muted !== muted) toggleMute();
    }),
  ];

  // Answered or declined on the lock screen before JavaScript was running.
  RNCallKeep.getInitialEvents()
    .then((events) => {
      for (const event of events) {
        if (event.name === "RNCallKeepPerformAnswerCallAction") onAnswer(event.data);
        else if (event.name === "RNCallKeepPerformEndCallAction") onEnd(event.data);
        else if (event.name === "RNCallKeepDidDisplayIncomingCall") {
          inCallKit.add(id(event.data.callUUID));
        }
      }
      RNCallKeep.clearInitialEvents();
    })
    .catch(() => undefined);

  // Keep CallKit in step with what happened in the app: a ring that stopped (answered
  // elsewhere, given up), a call ended in the app, or a call answered on the in-app screen.
  const unsubscribe = useCallStore.subscribe((state, previous) => {
    const activeId = state.active?.call?.id ?? null;
    const stillRinging = new Set(state.ringing.map((c) => c.id));
    for (const call of previous.ringing) {
      if (!stillRinging.has(call.id) && call.id !== activeId && inCallKit.has(call.id)) {
        inCallKit.delete(call.id);
        RNCallKeep.endCall(call.id);
      }
    }
    const previousId = previous.active?.call?.id ?? null;
    if (previousId && previousId !== activeId && inCallKit.has(previousId)) {
      inCallKit.delete(previousId);
      RNCallKeep.endCall(previousId);
    }
    if (activeId && activeId !== previousId && inCallKit.has(activeId)) {
      // Answered on the app's own screen: tell CallKit, so it stops ringing and hands over
      // the audio session. Its answer event is then a no-op.
      RNCallKeep.answerIncomingCall(activeId);
    }
  });

  return () => {
    for (const listener of listeners) listener.remove();
    VoipPush.removeEventListener("register");
    VoipPush.removeEventListener("didLoadWithEvents");
    unsubscribe();
  };
}
