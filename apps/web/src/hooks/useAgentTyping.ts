import { useCallback, useEffect, useRef } from "react";

import { sendAgentTyping } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { TYPING_HEARTBEAT_MS } from "@/store/typing.store";

/** Typing counts as stopped after this long without a keystroke. */
const IDLE_MS = 5_000;

interface Options {
  contactId: string;
  conversationId?: string | null;
  /** Off for notes and closed windows: nothing is announced then. */
  enabled: boolean;
}

/**
 * Announces this agent's typing for one thread. Call `onKeystroke` on every
 * draft change and `onSent` when the reply goes out.
 *
 * At most one request per {@link TYPING_HEARTBEAT_MS} while typing, plus one
 * when typing stops. The server throttles Meta further.
 */
export function useAgentTyping({ contactId, conversationId, enabled }: Options) {
  const lastPingRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const target = { contactId, conversationId };
  const targetRef = useRef(target);
  targetRef.current = target;
  // The thread typing was announced in. Stopping goes there, not to whichever
  // thread is open by the time the cleanup runs.
  const announcedRef = useRef<typeof target | null>(null);

  const post = (to: typeof target, typing: boolean, sent?: boolean) => {
    // Best-effort: a dropped ping only means a missed bubble.
    void sendAgentTyping(to.contactId, { ...to, typing, sent }).catch(() => {});
  };

  const stop = useCallback((sent?: boolean) => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
    const announced = announcedRef.current;
    lastPingRef.current = 0;
    announcedRef.current = null;
    if (announced) post(announced, false, sent);
  }, []);

  const onKeystroke = useCallback(() => {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastPingRef.current >= TYPING_HEARTBEAT_MS) {
      lastPingRef.current = now;
      announcedRef.current = targetRef.current;
      post(targetRef.current, true);
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => stop(), IDLE_MS);
  }, [enabled, stop]);

  const onSent = useCallback(() => stop(true), [stop]);

  // Switching to a note, or leaving the thread, ends typing in the old one.
  useEffect(() => {
    if (!enabled) stop();
  }, [enabled, stop]);
  useEffect(() => () => stop(), [contactId, conversationId, stop]);

  return { onKeystroke, onSent };
}
