import type { QueryClient } from "@tanstack/react-query";
import { create } from "zustand";

import {
  acceptCall,
  type CallDto,
  type CallWsEvent,
  getCallOffer,
  heartbeatCall,
  rejectCall,
  startCall,
  terminateCall,
} from "@/api/whatsapp/calling";
import {
  answerOffer,
  applyAnswer,
  closeCallMedia,
  createOffer,
  type MediaState,
  setMicrophoneMuted,
  setSpeakerOn,
  startRinging,
  stopRinging,
} from "@/utils/callMedia";

/**
 * WhatsApp calls on the phone. The same state machine as rateup-ui's `store/call.store.ts`
 * — keep the two in step — with phone-specific controls (speaker) and no page-unload
 * handling: an app that is killed mid-call stops heartbeating, and the server hangs up.
 *
 * `preparing` — microphone and offer are being set up (outbound) or the answer is being
 *               built and sent (inbound).
 * `ringing`   — outbound only: Meta is ringing the customer.
 * `connecting`— both sides agreed; waiting for audio to flow.
 * `connected` — talking.
 */
export type ActiveCallPhase = "preparing" | "ringing" | "connecting" | "connected";

export interface ActiveCall {
  /** Null only while an outbound call is being prepared and Meta has not named it yet. */
  call: CallDto | null;
  contactId: string | null;
  contactName: string | null;
  customerWaId: string | null;
  direction: CallDto["direction"];
  phase: ActiveCallPhase;
  muted: boolean;
  speaker: boolean;
  connectedAt: number | null;
}

interface CallStore {
  /** Inbound calls waiting for someone on this phone to answer. */
  ringing: CallDto[];
  active: ActiveCall | null;
  /** The call that just finished, for the "call ended" notice. */
  lastEnded: CallDto | null;
  /** The call screen shrunk to a bar. Every new ring, dial or answer opens it full again. */
  minimized: boolean;
}

export const useCallStore = create<CallStore>()(() => ({
  ringing: [],
  active: null,
  lastEnded: null,
  minimized: false,
}));

const set = useCallStore.setState;
const get = useCallStore.getState;

/** Outbound calls whose SDP answer has been applied; see the `answer` event. */
const answeredCalls = new Set<string>();

/** A customer's SDP answer that beat our own `startCall` response back to the phone. */
const earlyAnswers = new Map<string, string>();

/** Well inside the server's 20 s liveness window, so one lost beat is not a hang-up. */
const HEARTBEAT_MS = 5000;
let heartbeat: ReturnType<typeof setInterval> | null = null;

function startHeartbeat(callId: string) {
  stopHeartbeat();
  heartbeat = setInterval(() => void heartbeatCall(callId).catch(() => undefined), HEARTBEAT_MS);
}

function stopHeartbeat() {
  if (heartbeat) clearInterval(heartbeat);
  heartbeat = null;
}

function syncRinger(ringing: CallDto[]) {
  if (ringing.length > 0 && !get().active) startRinging();
  else stopRinging();
}

function setRinging(ringing: CallDto[]) {
  set({ ringing });
  syncRinger(ringing);
}

function onMediaState(state: MediaState) {
  const active = get().active;
  if (!active) return;
  if (state === "connected") {
    set({
      active: { ...active, phase: "connected", connectedAt: active.connectedAt ?? Date.now() },
    });
  } else if (state === "failed") {
    void hangUp();
  }
}

function finish(call: CallDto | null) {
  stopHeartbeat();
  closeCallMedia();
  set({ active: null, lastEnded: call });
  syncRinger(get().ringing);
}

/** When each ring arrived over the socket, so a resync in flight cannot drop it. */
const pushedAt = new Map<string, number>();
const PUSH_GRACE_MS = 10_000;

/**
 * Make the ringing list match the server's. The socket is the fast path; this covers what
 * it cannot — a call that rang while the app was in the background (the push), or a socket
 * that dropped. Run on launch, on every return to the foreground, and on a call push tap.
 */
export function syncRingingCalls(calls: CallDto[]) {
  const now = Date.now();
  const fromServer = new Set(calls.map((c) => c.id));
  const justPushed = get().ringing.filter(
    (c) => !fromServer.has(c.id) && now - (pushedAt.get(c.id) ?? 0) < PUSH_GRACE_MS,
  );
  const activeId = get().active?.call?.id;
  const next = [...justPushed, ...calls.filter((c) => c.id !== activeId)];
  if (next.some((c) => !get().ringing.some((r) => r.id === c.id))) set({ minimized: false });
  setRinging(next);
}

/** The `call` WebSocket event. */
export function receiveCallEvent(event: CallWsEvent, queryClient: QueryClient) {
  const { call } = event;
  const { ringing, active } = get();
  const isActive = active?.call?.id === call.id;

  switch (event.event) {
    case "incoming":
      if (!ringing.some((c) => c.id === call.id)) {
        pushedAt.set(call.id, Date.now());
        set({ minimized: false });
        setRinging([call, ...ringing]);
      }
      break;

    case "updated":
      // Answered on another device or by another agent, or declined: stop ringing here.
      if (call.status !== "RINGING") setRinging(ringing.filter((c) => c.id !== call.id));
      if (isActive && active) {
        if (call.status === "REJECTED") {
          finish(call);
        } else {
          const phase =
            call.status === "ACCEPTED" && active.phase === "ringing" ? "connecting" : active.phase;
          set({ active: { ...active, call, phase } });
        }
      }
      break;

    case "answer":
      if (!event.sdp) break;
      // Applied once per call. A repeat must not drop a live call back to "Connecting…" —
      // and phase cannot tell, since an ACCEPTED status can arrive before the answer does.
      if (answeredCalls.has(call.id)) break;
      if (isActive && active) {
        answeredCalls.add(call.id);
        set({
          active: {
            ...active,
            call,
            phase: active.phase === "connected" ? "connected" : "connecting",
          },
        });
        void applyAnswer(event.sdp).catch(() => void hangUp());
      } else if (active?.direction === "BUSINESS_INITIATED" && !active.call) {
        earlyAnswers.set(call.waCallId, event.sdp);
      }
      break;

    case "ended":
      setRinging(ringing.filter((c) => c.id !== call.id));
      if (isActive) finish(call);
      if (call.contactId) {
        void queryClient.invalidateQueries({ queryKey: ["wa-messages", call.contactId] });
      }
      // The call history screen, if open, gains the call that just finished.
      void queryClient.invalidateQueries({ queryKey: ["wa-call-log"] });
      break;
  }
}

/** Pick up an inbound call. Rejects (and cleans up) if another agent got there first. */
export async function answer(callId: string) {
  const call = get().ringing.find((c) => c.id === callId);
  if (!call || get().active) return;

  set({
    minimized: false,
    active: {
      call,
      contactId: call.contactId,
      contactName: call.contactName,
      customerWaId: call.customerWaId,
      direction: call.direction,
      phase: "preparing",
      muted: false,
      speaker: false,
      connectedAt: null,
    },
  });
  setRinging(get().ringing.filter((c) => c.id !== callId));

  try {
    const { sdp: offer } = await getCallOffer(callId);
    const sdp = await answerOffer(offer, onMediaState);
    const accepted = await acceptCall({ callId, sdp });
    startHeartbeat(callId);
    const current = get().active;
    if (current?.call?.id === callId) {
      set({
        active: {
          ...current,
          call: accepted,
          phase: current.phase === "connected" ? "connected" : "connecting",
        },
      });
    }
  } catch (error) {
    finish(null);
    throw error;
  }
}

/**
 * Stop ringing this phone without declining: a customer's call rings every agent who can
 * take it, and one passing must not hang up on the customer for the rest. Used by the
 * Android notification's Dismiss and CallKit's decline.
 */
export function dismissRinging(callId: string) {
  setRinging(get().ringing.filter((c) => c.id !== callId));
}

export async function decline(callId: string) {
  setRinging(get().ringing.filter((c) => c.id !== callId));
  await rejectCall(callId);
}

/** Dial a customer from the number the conversation runs on. */
export async function dial(input: {
  phoneId: string;
  contactId: string;
  contactName: string | null;
  customerWaId: string | null;
}) {
  if (get().active) throw new Error("Finish the current call first");
  set({
    minimized: false,
    active: {
      call: null,
      contactId: input.contactId,
      contactName: input.contactName,
      customerWaId: input.customerWaId,
      direction: "BUSINESS_INITIATED",
      phase: "preparing",
      muted: false,
      speaker: false,
      connectedAt: null,
    },
  });
  syncRinger(get().ringing);

  try {
    const sdp = await createOffer(onMediaState);
    const call = await startCall({ phoneId: input.phoneId, contactId: input.contactId, sdp });
    startHeartbeat(call.id);
    const current = get().active;
    if (!current) {
      // Hung up while Meta was still accepting the dial.
      await terminateCall(call.id).catch(() => undefined);
      return;
    }
    set({ active: { ...current, call, phase: "ringing" } });
    const early = earlyAnswers.get(call.waCallId);
    if (early) {
      earlyAnswers.delete(call.waCallId);
      answeredCalls.add(call.id);
      set({ active: { ...current, call, phase: "connecting" } });
      await applyAnswer(early);
    }
  } catch (error) {
    finish(null);
    throw error;
  }
}

export async function hangUp() {
  const active = get().active;
  if (!active) return;
  const callId = active.call?.id;
  // Media goes first: the agent pressed hang up, so the microphone stops now whatever the
  // network does. The `ended` event that follows the terminate webhook is then a no-op.
  finish(active.call);
  if (callId) await terminateCall(callId).catch(() => undefined);
}

export function toggleMute() {
  const active = get().active;
  if (!active) return;
  setMicrophoneMuted(!active.muted);
  set({ active: { ...active, muted: !active.muted } });
}

export function toggleSpeaker() {
  const active = get().active;
  if (!active) return;
  setSpeakerOn(!active.speaker);
  set({ active: { ...active, speaker: !active.speaker } });
}

export function clearLastEnded() {
  set({ lastEnded: null });
}

export function setCallScreenMinimized(minimized: boolean) {
  set({ minimized });
}
