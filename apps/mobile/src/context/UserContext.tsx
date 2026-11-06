import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { orgWsMessage } from "./type";
import { useAuth } from "./AuthContext";
import { getMobileId } from "../util";
import SuperTokens from "supertokens-react-native";
import { isEqual } from "lodash";
import {
  mergeStats,
  messageTime,
  resolveRowKey,
  rowKeysForContact,
  useContactsStore,
  useMessagesStore,
} from "../store/inboxStore";
import { useInboxCountStore } from "../store/inboxCountStore";
import { useOpenChatStore } from "../utils/store";
import { WaMessageAssignStatus } from "../api/inbox/types";
import { queryClient } from "../config/queryClient";
import { receiveCallEvent } from "@/store/callStore";
import { logger } from "@/utils/logger";
import { saveMessagesToIDB } from "@/utils/sqlite";
import { API_URL } from "@/config/env";

/**
 * Refetch what a dropped socket may have left stale.
 *
 * The server sends each frame once, to whoever is connected at that moment; it
 * keeps no backlog. Anything broadcast during the gap — a customer message, an
 * agent's reply, a status change — never arrives, so the list and the open
 * thread are re-read from the API instead.
 *
 * `cancelRefetch: false` joins a fetch already in flight rather than restarting
 * it: coming back to the foreground both reconnects the socket and triggers the
 * focus refetch (see `config/queryClient.ts`), and those should cost one request,
 * not two.
 */
const refetchAfterReconnect = () => {
  const options = { cancelRefetch: false };
  queryClient.invalidateQueries({ queryKey: ["contacts", "filtered"] }, options);
  queryClient.invalidateQueries({ queryKey: ["wa-messages"] }, options);
  queryClient.invalidateQueries({ queryKey: ["contactCounts"] }, options);
};

interface UserContextProps {
  user: any;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  wsData: orgWsMessage;
  setWsData: React.Dispatch<React.SetStateAction<orgWsMessage>>;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

const ORG_WS_BASE_PATH = "/org/ws";
const WEBSOCKET_PROTOCOL = API_URL.startsWith("https") ? "wss" : "ws";
const WEBSOCKET_URL = API_URL.replace(/(http)s?/, WEBSOCKET_PROTOCOL);
const WS_URL = `${WEBSOCKET_URL}/api${ORG_WS_BASE_PATH}`;

/**
 * React Native's WebSocket constructor, which takes request headers as a third argument.
 * The project's DOM lib types only the browser's two-argument form.
 */
type NativeWebSocket = new (
  url: string,
  protocols: string | string[] | null,
  options: { headers: Record<string, string> },
) => WebSocket;

/**
 * Which of a contact's inbox rows (one per ticket) is quoting this message as its
 * preview, if any. Status and edit frames name the message, not the ticket.
 */
const rowKeyQuotingMessage = (contactId: string, messageId: string): string | null => {
  const { contactsById } = useContactsStore.getState();
  for (const key of rowKeysForContact(contactsById, contactId)) {
    const lastMessage = contactsById.get(key)?.lastMessage;
    if (lastMessage && (lastMessage.messageId ?? lastMessage.id) === messageId) return key;
  }
  return null;
};

/**
 * Patch a delivery receipt straight into the stores.
 *
 * Deliberately not routed through `wsData` like the `inbox` events are. Three
 * frames arrive per outgoing message (sent → delivered → read), often inside a
 * single React batch — `setWsData` keeps only the last, so an effect watching it
 * would silently drop the earlier ones. They also have to land while neither the
 * inbox list nor the thread is mounted, or the ticks would be stale on return.
 */
const applyMessageStatusUpdate = (
  update: NonNullable<orgWsMessage["message_status_update"]> | undefined,
) => {
  if (!update?.messageId) return;
  const { contactId, messageId, stats } = update;

  useMessagesStore.getState().applyMessageStatus(contactId, messageId, stats);

  // The inbox row shows its own tick against the last message, and that copy
  // lives on the row rather than in the message store.
  if (!contactId) return;
  const rowKey = rowKeyQuotingMessage(contactId, messageId);
  if (!rowKey) return;
  const lastMessage = useContactsStore.getState().contactsById.get(rowKey)?.lastMessage;

  const mergedStats = mergeStats(lastMessage.stats, stats);
  // `updateContactById` rewrites the map and stamps `updatedAt` unconditionally,
  // so a no-op call would re-render the list on every frame.
  if (isEqual(lastMessage.stats, mergedStats)) return;

  useContactsStore.getState().updateContactById(rowKey, (c) => ({
    ...c,
    lastMessage: { ...c.lastMessage, stats: mergedStats },
  }));
};

/**
 * The customer edited an Instagram message: the frame carries the whole updated
 * row, which replaces every cached copy (one per thread key the contact owns) and
 * the inbox row's last-message snippet when it is that message.
 */
const applyMessageEdited = (update: orgWsMessage["message_edited"]) => {
  const row = update?.message;
  if (!update?.messageId || !row?.messageBody) return;
  const { contactId, messageId } = update;
  const patch = { messageBody: row.messageBody, editedAt: update.editedAt ?? row.editedAt };

  const store = useMessagesStore.getState();
  const m = new Map(store.messagesByKey);
  const changed: { key: string; message: typeof row }[] = [];
  for (const [key, entry] of m) {
    if (contactId && !key.startsWith(`${contactId}_`)) continue;
    const idx = entry.messages.findIndex((msg) => (msg.messageId ?? msg.id) === messageId);
    if (idx === -1) continue;
    const updated = { ...entry.messages[idx], ...patch };
    const messages = [...entry.messages];
    messages[idx] = updated;
    m.set(key, { ...entry, messages });
    changed.push({ key, message: updated });
  }
  if (changed.length) {
    useMessagesStore.setState({ messagesByKey: m });
    changed.forEach(({ key, message }) => saveMessagesToIDB(key, [message]));
  }

  if (!contactId) return;
  const rowKey = rowKeyQuotingMessage(contactId, messageId);
  if (!rowKey) return;
  useContactsStore.getState().updateContactById(rowKey, (c) => ({
    ...c,
    lastMessage: { ...c.lastMessage, ...patch },
  }));
};

/**
 * Fold an inbound `inbox` frame into the contacts/messages stores.
 *
 * Applied straight off the socket rather than through `wsData` for the same
 * reason `applyMessageStatusUpdate` is: `setWsData` keeps only the last frame of
 * a React batch, so two messages arriving together left the earlier one out of
 * the list entirely. It also has to land while the inbox screen is unmounted —
 * previously this lived in an effect inside <Inbox>, so anything that arrived
 * while the user was on another tab was lost until a manual refresh.
 */
const applyInboxUpdate = (inbox: orgWsMessage["inbox"] | undefined) => {
  const contactId = inbox?.contact?.id;
  const message = inbox?.message as any;
  if (!contactId) return;

  const contactsStore = useContactsStore.getState();
  const isUnread =
    Array.isArray(message?.readUsers) && message.readUsers.length === 0 && message?.sendBy === null;
  // The frame names its ticket (`conversationId` on the contact); the list has a
  // row per ticket, so the message lands on that row, or opens a new one.
  const conversationId = (inbox?.contact as { conversationId?: string | null } | undefined)
    ?.conversationId;
  const rowKey = resolveRowKey(contactsStore, contactId, conversationId);
  // The chat screen shows all of a contact's tickets in one thread, so any of
  // them landing while that chat is open has been seen.
  const isOpenInThread = useOpenChatStore.getState().openChatId === contactId;

  if (rowKey) {
    contactsStore.updateContactById(
      rowKey,
      (oldContact) => {
        if (!oldContact) return oldContact;
        // Frames are not guaranteed to arrive in order (a send is recorded only
        // after Meta answers, and a store retry can land later still), so an
        // older message must not replace a newer preview.
        const isLatest =
          !oldContact.lastMessage || messageTime(message) >= messageTime(oldContact.lastMessage);
        return {
          ...oldContact,
          ...inbox?.contact,
          lastMessage: isLatest ? message : oldContact.lastMessage,
          lastReceivedMessageTimeStamp: inbox?.contact?.lastReceivedMessageTimeStamp,
          // The frame carries a bare `Contact`, so it has no ticket clock of its
          // own — but that clock is what the list sorts by. Advance it with the
          // message, or a chat that goes live while the app is open keeps the
          // stamp from the last fetch and never moves to the top.
          conversationLastMessageAt: isLatest
            ? (message?.waCreatedAt ?? oldContact.conversationLastMessageAt)
            : oldContact.conversationLastMessageAt,
          // `isOpenInThread` mirrors rateup-ui's realtime handler: a message
          // that lands while you are looking at that very chat is already
          // read, so counting it would put a badge on the row you are
          // standing in — and nothing would clear it until you left and came
          // back.
          unReadMessageCount: isOpenInThread
            ? 0
            : isUnread
              ? (oldContact.unReadMessageCount ?? 0) + 1
              : (oldContact.unReadMessageCount ?? 0),
        };
      },
      isUnread,
    );
  } else if (contactsStore.currentFilterKey) {
    // A message that opens a ticket the list has never seen. `updateContactById`
    // bails on an unknown contact, so without this branch the very first message
    // of a new conversation never appeared in Open — only after a refresh.
    // rateup-ui's socket handler does exactly this.
    contactsStore.addContactsForFilter(
      contactsStore.currentFilterKey,
      [
        {
          ...inbox?.contact,
          lastMessage: message,
          lastReceivedMessageTimeStamp:
            inbox?.contact?.lastReceivedMessageTimeStamp ?? message?.waCreatedAt,
          conversationLastMessageAt: message?.waCreatedAt,
          unReadMessageCount: isOpenInThread ? 0 : isUnread ? 1 : 0,
          updatedAt: new Date().toISOString(),
        },
      ],
      true,
    );

    // Optimistic; the next `/count` fetch overwrites it with the real figure.
    const status = inbox?.contact?.waMessageAssignStatus;
    const { bumpCounts } = useInboxCountStore.getState();
    if (status === WaMessageAssignStatus.ASSIGNED || status === WaMessageAssignStatus.UNASSIGNED) {
      bumpCounts({ openCount: 1, allCount: 1 });
    } else if (status === WaMessageAssignStatus.CLOSED) {
      bumpCounts({ closedCount: 1, allCount: 1 });
    } else {
      bumpCounts({ allCount: 1 });
    }
    if (status === WaMessageAssignStatus.UNASSIGNED) bumpCounts({ newCount: 1 });
  }

  if (!message) return;
  const messagesStore = useMessagesStore.getState();
  messagesStore.mergeMessages(
    `${contactId}_${message.sourceIdentifier || message.id}`,
    [message],
    false,
  );
  messagesStore.mergeMessages(`${contactId}_all`, [message], false);
};

/**
 * A note goes into the contact's cached threads and nowhere else: it is not
 * customer traffic, so the row's preview, unread count and sort clock stay put.
 */
const applyInboxNote = (note: orgWsMessage["inbox_note"] | undefined) => {
  if (!note?.contactId || !note.message) return;
  const messagesStore = useMessagesStore.getState();
  const prefix = `${note.contactId}_`;
  const keys = new Set([`${prefix}all`]);
  // Threads are also cached per channel, and every channel's thread shows notes.
  for (const key of messagesStore.messagesByKey.keys()) if (key.startsWith(prefix)) keys.add(key);
  for (const key of keys) messagesStore.mergeMessages(key, [note.message], false);
};

const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [wsData, setWsData] = useState<orgWsMessage>({} as orgWsMessage);
  const { orgId, isAuthenticated } = useAuth();
  const [mobileId, setMobileId] = useState<string | null>(null);
  const connectionRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectingRef = useRef(false);
  const retryIntervalRef = useRef(1000); // 1s, exponential backoff
  // Whether a socket has opened before. The first open follows the screens'
  // own initial fetches, so only a later one — a reconnect — refetches.
  const hasConnectedRef = useRef(false);
  // `connectWebSocket` closes over isAuthenticated/orgId/mobileId, and it gets
  // stored in socket.onclose and the AppState listener — both of which outlive
  // the render that created them. Deferred calls go through this ref so they
  // always run the current version instead of a frozen closure.
  const connectWebSocketRef = useRef<() => void>(() => {});
  useEffect(() => {
    let mounted = true;

    const loadMobileId = async () => {
      const id = await getMobileId();
      if (mounted) setMobileId(id);
    };

    loadMobileId();

    return () => {
      mounted = false;
    };
  }, []);

  const connectWebSocket = async () => {
    if (connectionRef.current || connectingRef.current || !isAuthenticated || !orgId || !mobileId) {
      return;
    }
    // Held across the token read below, so a resume and a backoff timer firing together
    // cannot each open a socket.
    connectingRef.current = true;
    let token: string | undefined;
    try {
      token = await SuperTokens.getAccessToken();
    } finally {
      connectingRef.current = false;
    }

    if (!token) {
      logger.log("no token found");
      return;
    }
    // Something else connected while the token was being read.
    if (connectionRef.current) return;

    // The token goes in the Authorization header, never the URL: query strings end up
    // in proxy and access logs. React Native's WebSocket takes headers as a third
    // argument. Each (re)connect reads the token afresh, so a refreshed one is used.
    const socket = new (WebSocket as unknown as NativeWebSocket)(
      `${WS_URL}/${mobileId}/mobilews`,
      null,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    connectionRef.current = socket;

    socket.onopen = () => {
      logger.log("📡 WebSocket connected");
      retryIntervalRef.current = 1000;
      if (hasConnectedRef.current) refetchAfterReconnect();
      hasConnectedRef.current = true;
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message?.type === "message_status_update") {
          applyMessageStatusUpdate(message.message_status_update);
        }
        if (message?.type === "inbox") {
          applyInboxUpdate(message.inbox);
        }
        if (message?.type === "message_edited") {
          applyMessageEdited(message.message_edited);
        }
        if (message?.type === "inbox_note") {
          applyInboxNote(message.inbox_note);
        }
        if (message?.type === "meta_agent_thread" && message.meta_agent_thread?.contactId) {
          const { contactId, owner, reason, at } = message.meta_agent_thread;
          useContactsStore.getState().patchContactRows(contactId, {
            metaAgentThreadOwner: owner,
            metaAgentThreadOwnerAt: at,
            metaAgentHandoverReason: reason,
          });
        }
        if (message?.type === "call" && message.call) {
          receiveCallEvent(message.call, queryClient);
        }
        setWsData(message);
      } catch (err) {
        logger.error("❌ Error parsing WebSocket message:", err);
      }
    };

    socket.onclose = () => {
      logger.log("🔌 WebSocket disconnected");

      if (connectionRef.current === socket) {
        connectionRef.current = null;
      }

      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        retryIntervalRef.current = Math.min(retryIntervalRef.current * 2, 30000);
        connectWebSocketRef.current();
      }, retryIntervalRef.current);
    };

    // The event carries no reason (React Native gives none), and onclose follows and
    // reconnects, so a one-line note is enough.
    socket.onerror = () => {
      logger.warn("💥 WebSocket error, will reconnect");
    };
  };

  // Runs after every render, so the ref always holds the newest closure. Must
  // stay declared above the effects below — effects fire in declaration order,
  // so this refreshes the ref before anything reads it.
  useEffect(() => {
    connectWebSocketRef.current = connectWebSocket;
  });

  useEffect(() => {
    if (!mobileId) return;
    connectWebSocketRef.current();
    return () => {
      if (connectionRef.current) {
        // Detached first: this close is deliberate, and onclose would schedule a
        // reconnect after the provider has gone (or a duplicate alongside the next one).
        connectionRef.current.onclose = null;
        connectionRef.current.close();
        connectionRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [mobileId, orgId]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (
        state === "active" &&
        connectionRef.current?.readyState !== WebSocket.OPEN &&
        isAuthenticated
      ) {
        logger.log("🔁 Reconnecting WebSocket on app resume");
        connectWebSocketRef.current();
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated]);

  return (
    <UserContext.Provider value={{ user, setUser, wsData, setWsData }}>
      {children}
    </UserContext.Provider>
  );
};

const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

const useWsData = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useWsData must be used within a UserProvider");
  }
  return { wsData: context.wsData, setWsData: context.setWsData };
};

export { UserProvider, useUser, useWsData };
