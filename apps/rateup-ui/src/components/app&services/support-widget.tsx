import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useClickOutside } from "@/hooks/use-click-outside.ts";
import { useScrollIntoView } from "@/hooks/use-scroll-into-view.ts";
import { getBrowserId } from "@/lib/browserId.ts";

import { WhatsAppMark } from "../RateupHomePage/shared/channel-marks.tsx";
import { AUTO_OPENED_KEY, PersonGlyph, SupportLauncher } from "./support-launcher.tsx";
import { renderWhatsAppMarkup } from "./waMarkup.tsx";

/* Only the contact card draws it, and it carries the phone metadata the validator needs too. */
const loadPhoneInput = () => import("./widget-phone-input.tsx");
const WidgetPhoneInput = lazy(loadPhoneInput);

/**
 * The support widget, drawn to the marketing design.
 *
 * Two pieces: a launcher (a navy "How can we help you?" pill beside a navy avatar tile) and,
 * once opened, a 384x640 panel with its own header, a scrolling conversation, a composer and
 * a tab bar. Colour comes from the `ru-*` ramp in `styles/foundation.css`, which is the same palette the
 * design was drawn against — `--surface-2` is `ru-n-50`, `--border` is `ru-n-200`, `--fg` is
 * `ru-n-700` and `--accent` is `ru-blue-600`.
 *
 * The Email tab posts to `/api/support/email`, which mails the org owner. It does not go
 * through the chat pipeline: that is keyed on phone number, and an email-only visitor has none.
 */

interface SupportWidgetProps {
  whatsappNumber?: string;
  companyName?: string;
  orgId: string;
  token: string;
  backendUrl?: string;
  webhookUrl?: string;
  /**
   * Openers offered under the greeting, the same idea as the Instagram ice breakers in
   * `instagram_messaging.service.ts`. Tapping one sends it as an ordinary first message.
   * Pass an empty array to draw none.
   */
  icebreakers?: string[];
  /**
   * Opens the panel on its own this many milliseconds after the widget mounts. Omit it (the
   * default) and the panel only ever opens on a tap.
   */
  autoOpenDelayMs?: number;
  /** Mount with the panel already open — for a host that drew its own launcher first. */
  defaultOpen?: boolean;
}

interface Message {
  id: string;
  /** When the row was stored. The only clock both directions carry — see messageTimestampMs. */
  waCreatedAt?: string;
  messageBody: {
    exchangeProcess: "send" | "receive";
    /* The outbound WhatsApp send payload as it went to Meta: a recipient and a body, and
       none of the metadata an inbound message arrives with. */
    send: {
      id?: string;
      text: { body: string };
      type: string;
      timestamp?: string;
    } | null;
    receive: {
      messages: [{ id: string; text: { body: string }; type: string; timestamp: string }];
    } | null;
  };
}

interface ContactValues {
  name: string;
  phone: string;
  /* Optional: the conversation is carried on WhatsApp, so the number is the only address we
     actually need. Left blank it is dropped from the payload rather than posted as "". */
  email: string;
}

interface EmailValues {
  name: string;
  email: string;
  message: string;
}

/* zod's `z.email()` pattern, so the widget accepts what it accepted before without zod. */
const EMAIL_PATTERN =
  /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+.-]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

const required = (message: string) => (value: string) => value.length > 0 || message;
const validEmail = (value: string) => EMAIL_PATTERN.test(value) || "Invalid email";
const validPhone = async (value: string) =>
  (await loadPhoneInput()).isValidPhoneNumber(value) || "Invalid phone number";

/* Mirrors `WA_INBOX_WEBSOCKET_CONNECTION_STRING` in `backend/org/ws/org.ws.api.ts`, which
   cannot be imported here: it drags the authenticated API client into the marketing bundle. */
const API_BASE: string = import.meta.env.VITE_API_URL || "http://localhost:3001";
const WS_BASE = `${API_BASE.replace(/(http)s?/, API_BASE.startsWith("https") ? "wss" : "ws")}/api/org/ws`;

/* Throws on a non-2xx status and reads a JSON body when there is one, as axios did. */
async function postJson(url: string, body: unknown, token: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`POST ${url} failed with ${response.status}`);
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/* The design's field styling: 50px tall, 12px radius, accent border on focus. */
const FIELD =
  "h-12.5 w-full rounded-xl border border-ru-n-200 bg-white px-3.5 text-[15.5px] text-ru-n-700 outline-none transition-colors placeholder:text-ru-n-400 focus:border-ru-blue-600";

const ERROR_TEXT = "mt-1 text-[12.5px] text-destructive";

/* How long the contact card waits after the last thing the visitor sent. Every new message
   pushes it back, so someone firing off two or three questions in a row is never cut off
   mid-thought — the card only lands once they have actually paused. */
const CONTACT_PROMPT_DELAY_MS = 2500;

/* Deliberately generic: the widget is embedded on customers' own sites, not RateUp's, so the
   openers have to make sense for any of them. Anything sharper is the embedder's to pass in. */
const DEFAULT_ICEBREAKERS = [
  "I have a question about my order",
  "I need help with my account",
  "Can someone call me back?",
];

function ChatGlyph({ className = "size-5" }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4 4h16v11H9l-5 4V4Z" />
    </svg>
  );
}

function MailGlyph({ className = "size-5" }: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.6 6.5 8.4 6 8.4-6" />
    </svg>
  );
}

function SendGlyph({ className = "size-4.75" }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3 4.5 21 12 3 19.5l3.4-7.5L3 4.5Z" />
    </svg>
  );
}

/** The business's own messages are `send`; anything the visitor typed comes back as `receive`. */
function isFromVisitor(message: Message) {
  return message.messageBody?.exchangeProcess === "receive";
}

function messageText(message: Message) {
  return (
    message.messageBody?.receive?.messages?.[0]?.text?.body ||
    message.messageBody?.send?.text?.body ||
    ""
  );
}

/**
 * Appends only what is not already in the thread. The same message reaches us by two routes —
 * the socket pushes it live, and the history fetch returns it too — and either can arrive
 * first, so `id` is what decides. Without this the widget drew everything twice.
 */
function mergeMessages(existing: Message[], incoming: Message[]) {
  const seen = new Set(existing.map((message) => message?.id).filter(Boolean));
  return [...existing, ...incoming.filter((message) => message?.id && !seen.has(message.id))];
}

/**
 * A message id in the shape Meta's ids take, mirroring `generateWebchatMessageId` in
 * rateup-api's `utils/messageId.ts` — keep the two in step.
 *
 * `wcmid` — web chat message id — and deliberately not Meta's `wamid`, which is short for
 * WhatsApp Message ID and would claim a message that never touched WhatsApp. The prefix is
 * what makes a widget message tellable from a WhatsApp one by its id alone, with no other
 * column to hand. It must also be unique per message: it used to be built from the visitor's
 * phone number, which gave a whole thread one id and collapsed it to a single bubble.
 */
function generateWebchatMessageId() {
  return (
    "wcmid." +
    Date.now().toString(36) +
    "-" +
    Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** The design stamps bubbles with a bare clock, in whatever locale the visitor is browsing in. */
function timeLabel(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function messageTimestampMs(message: Message) {
  /* `waCreatedAt` first: it is on every row and is the only clock both directions carry.
     An outbound message's `send` body is the payload that went to Meta — a recipient and a
     body — with no timestamp in it at all, so reading that alone dated every reply to 0 and
     sorted it to the top of the thread. */
  const created = message.waCreatedAt ? Date.parse(message.waCreatedAt) : Number.NaN;
  if (!Number.isNaN(created)) return created;

  const seconds = Number(
    message.messageBody?.receive?.messages?.[0]?.timestamp || message.messageBody?.send?.timestamp,
  );
  return seconds ? seconds * 1000 : 0;
}

function messageTime(message: Message) {
  const at = messageTimestampMs(message);
  return at ? timeLabel(new Date(at)) : "";
}

export default function SupportWidget({
  whatsappNumber = import.meta.env.VITE_SUPPORT_WHATSAPP,
  companyName = "Team RateUp",
  orgId,
  token,
  backendUrl,
  webhookUrl,
  icebreakers = DEFAULT_ICEBREAKERS,
  autoOpenDelayMs,
  defaultOpen = false,
}: Readonly<SupportWidgetProps>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<"chat" | "whatsapp" | "email">("chat");
  const [newMessage, setNewMessage] = useState("");
  const [contactId, setContactId] = useState<string | null>(null);
  /* Messages typed before we know who the visitor is. They are drawn straight away, then
     posted once the contact exists — the send API cannot accept them any earlier. */
  const [pendingMessages, setPendingMessages] = useState<{ body: string; time: string }[]>([]);
  /* The greeting is drawn client-side, so its clock has to be stamped when the panel opens. */
  const [botTime, setBotTime] = useState("");
  /* The design answers a filled-in contact card with one more bot bubble. It carries the
     moment it was said so a later reply can be placed below it — see `ackSplit`. */
  const [ack, setAck] = useState<{ name: string; at: number } | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  /* Whether the contact card has had its beat and is ready to be drawn. */
  const [askForContact, setAskForContact] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const contactIdRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const browserId = getBrowserId();
  const { scrollIntoView, targetRef, scrollableRef } = useScrollIntoView<
    HTMLDivElement,
    HTMLDivElement
  >({ duration: 0 });
  const ref = useClickOutside<HTMLDivElement>(() => setIsOpen(false));
  const API_URL = backendUrl || import.meta.env.VITE_API_URL;
  /* `/:afterAuthId/widget`, not `/:afterAuthId/ws/:orgId` — the latter matched no route at all,
     so this socket never opened and the panel only ever caught up on reload. The org id and
     token ride the query string because a browser WebSocket cannot send an Authorization
     header, and `contactId` narrows the org-wide feed to this visitor's own thread. */
  const socketUrl =
    contactId && orgId && token
      ? webhookUrl ||
        `${WS_BASE}/${browserId}/widget?role=fab&orgId=${encodeURIComponent(orgId)}&accessToken=${encodeURIComponent(token)}&contactId=${encodeURIComponent(contactId)}`
      : null;
  const queryParams = orgId ? `?orgId=${orgId}` : "";
  const waHref = `https://wa.me/${(whatsappNumber || "").replace(/\D/g, "")}?text=${encodeURIComponent(
    "Hi, I need help with support",
  )}`;

  const form = useForm<ContactValues>({
    defaultValues: { name: "", phone: "", email: "" },
  });

  const emailForm = useForm<EmailValues>({
    defaultValues: { name: "", email: "", message: "" },
  });

  const handleEmailSubmit = emailForm.handleSubmit(async (values) => {
    try {
      await postJson(`${API_URL}/api/support/email${queryParams}`, values, token);
      setEmailSent(true);
      emailForm.reset();
    } catch (error) {
      console.error("Could not send the support email", error);
      emailForm.setError("root", { message: "That did not send. Please try again." });
    }
  });

  const [messages, setMessages] = useState<Message[]>([]);

  /* The fab socket is per-org, not per-visitor: every widget on the site is handed every
     webchat message the org sees. Anything that is not this visitor's own thread belongs to
     someone else and is dropped here. Read through a ref because the socket is opened once
     and would otherwise close over the `contactId` from first render, which is null. */
  function handleWebSocketMessage(event: MessageEvent) {
    let payload: { inbox?: { contact?: { id?: string }; message?: Message } };
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }

    const message = payload?.inbox?.message;
    const forContact = payload?.inbox?.contact?.id;
    if (!message?.id || !forContact || forContact !== contactIdRef.current) return;

    setMessages((prev) => mergeMessages(prev, [message]));
  }

  /* Opened only once there is a contact: before that there is no thread to listen to, and the
     socket has to name the contact it wants anyway. Re-runs when one is created, which is what
     puts the visitor on the live feed the moment they finish the contact card. */
  useEffect(() => {
    if (!browserId || !socketUrl) return;

    let ws: WebSocket | null = null;
    let closedByUser = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function connect(): void {
      ws = new WebSocket(socketUrl!);
      socketRef.current = ws;

      /* Otherwise the retry budget is spent over the life of the page rather than per
         outage, and realtime never comes back after five idle timeouts. */
      ws.onopen = () => {
        retryCountRef.current = 0;
      };

      ws.onmessage = handleWebSocketMessage;

      ws.onclose = () => {
        if (!closedByUser && retryCountRef.current < 5) {
          retryCountRef.current += 1;
          retryTimer = setTimeout(connect, 1000);
        }
      };
    }

    connect();

    return () => {
      closedByUser = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, [socketUrl, browserId]);

  useEffect(() => {
    const storedContactId = localStorage.getItem("support_contact_id");
    if (!storedContactId) return;
    contactIdRef.current = storedContactId;
    setContactId(storedContactId);

    fetch(`${API_URL}/api/support/contact/${storedContactId}${queryParams}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((json) => setMessages((prev) => mergeMessages(prev, Array.isArray(json) ? json : [])))
      .catch((error) => console.error("Could not load the support history", error));
  }, [token, API_URL, orgId]);

  useEffect(() => {
    if (isOpen) setBotTime((prev) => prev || timeLabel(new Date()));
  }, [isOpen]);

  /* A panel the visitor never asked for wears out its welcome fast, so the auto-open fires
     once a session: moving on to another page re-mounts the widget, and someone who has
     already closed it should not have it spring back on every page they read. */
  useEffect(() => {
    if (!autoOpenDelayMs || sessionStorage.getItem(AUTO_OPENED_KEY)) return;

    const timer = setTimeout(() => {
      sessionStorage.setItem(AUTO_OPENED_KEY, "true");
      setIsOpen(true);
    }, autoOpenDelayMs);

    return () => clearTimeout(timer);
  }, [autoOpenDelayMs]);

  /* Held back until the visitor stops sending, so the card reads as an answer to the thread
     rather than a form springing out from under the message they just wrote. Each new message
     re-runs this and re-arms the timer; once the card is up it stays up, since the branch that
     clears it needs the queue to have emptied or the contact to exist. */
  useEffect(() => {
    if (contactId || pendingMessages.length === 0) {
      setAskForContact(false);
      return;
    }
    const timer = setTimeout(() => setAskForContact(true), CONTACT_PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [contactId, pendingMessages.length]);

  /* Only drawn on the WhatsApp tab, so neither `qrcode` nor the image is fetched before it. */
  useEffect(() => {
    if (tab !== "whatsapp" || qr) return;
    import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(waHref, {
          margin: 0,
          width: 320,
          color: { dark: "#091729", light: "#ffffff" },
        }),
      )
      .then(setQr)
      .catch(() => setQr(null));
  }, [tab, qr, waHref]);

  useEffect(() => {
    scrollIntoView();
  }, [messages, pendingMessages, contactId, tab, askForContact]);

  /* Takes the contact explicitly rather than reading state: the flush below runs in the same
     tick as the contact being created, when `contactId` has not re-rendered yet. */
  const postMessage = async (body: string, supportContactId: string, phone: string) => {
    const messageBody = {
      object: "support_user",
      entry: [
        {
          id: supportContactId,
          changes: [
            {
              value: {
                messages: [
                  {
                    from: phone,
                    id: generateWebchatMessageId(),
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    text: { body },
                    type: "text",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    await postJson(`${API_URL}/api/support${queryParams}`, messageBody, token);
  };

  const handleContactSubmit = form.handleSubmit(async (formValues) => {
    const { email, ...rest } = formValues;
    const values = {
      ...rest,
      phone: formValues.phone.replace("+", ""),
      ...(email ? { email } : {}),
    };

    try {
      /* The route replies with the bare contact id as text/plain. */
      const newContactId = String(
        await postJson(`${API_URL}/api/support/contact${queryParams}`, values, token),
      );

      localStorage.setItem("support_contact_id", newContactId);
      localStorage.setItem("support_contact_name", values.phone);
      /* Set before the first post, not just queued as state: the server echoes each message
         back over the socket almost immediately, and the handler drops anything whose contact
         it does not recognise — a ref that is still null would throw the echo away. */
      contactIdRef.current = newContactId;
      setContactId(newContactId);

      /* Whatever they typed before we had somewhere to send it. Posted in order, and each is
         dropped the moment it lands, so it hands over to the echoed copy instead of sitting
         alongside it — that overlap was the message appearing twice. A post that throws
         leaves the rest on screen to retry. */
      for (const pending of pendingMessages) {
        await postMessage(pending.body, newContactId, values.phone);
        setPendingMessages((prev) => prev.filter((queued) => queued !== pending));
      }
      setAck({ name: values.name.trim(), at: Date.now() });
    } catch (error) {
      console.error("Could not start the support conversation", error);
    }
  });

  const sendMessage = async (body: string) => {
    const supportContactId = localStorage.getItem("support_contact_id");
    const phone = localStorage.getItem("support_contact_name") ?? "";

    /* No contact yet: hold the message and let the form ask who to reply to. */
    if (!supportContactId) {
      setPendingMessages((prev) => [...prev, { body, time: timeLabel(new Date()) }]);
      return;
    }

    try {
      await postMessage(body, supportContactId, phone);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  /* The acknowledgement is drawn by the widget, not sent by the server, so it has no place
     in `messages` — but it was said at a moment, and a reply arriving afterwards has to show
     below it rather than above. This is where it splits the thread. */
  const ackSplit = useMemo(() => {
    if (!ack) return messages.length;
    const index = messages.findIndex((message) => messageTimestampMs(message) > ack.at);
    return index === -1 ? messages.length : index;
  }, [messages, ack]);

  const renderMessage = (message: Message, index: number) =>
    isFromVisitor(message) ? (
      <div
        key={message?.id ?? index}
        className="max-w-[86%] self-end rounded-[16px_16px_5px_16px] bg-ru-blue-600 px-3.75 py-3 text-[15.5px]/[1.5] text-white"
      >
        {renderWhatsAppMarkup(messageText(message))}
        <div className="mt-1 text-[11.5px] opacity-[0.72]">{messageTime(message)}</div>
      </div>
    ) : (
      <div key={message?.id ?? index} className="flex items-end gap-2.5">
        <span className="inline-flex size-8.5 flex-none items-center justify-center rounded-[10px] bg-ru-blue-950 text-white">
          <ChatGlyph className="size-4.25" />
        </span>
        <div className="max-w-[86%]">
          <div className="rounded-[16px_16px_16px_5px] border border-ru-n-200 bg-white px-3.75 py-3 text-[15.5px]/[1.5] text-ru-n-700">
            {renderWhatsAppMarkup(messageText(message))}
          </div>
          <div className="mt-1.25 text-xs text-ru-n-400">{messageTime(message)}</div>
        </div>
      </div>
    );

  const handleSendMessage = () => {
    const body = newMessage.trim();
    if (!body) return;
    setNewMessage("");
    return sendMessage(body);
  };

  if (!orgId || !token) return null;

  if (!isOpen) return <SupportLauncher onOpen={() => setIsOpen(true)} />;

  return (
    <div
      ref={ref}
      className="fixed right-5 bottom-5 z-[90] flex h-[min(80vh,640px)] w-[min(94vw,384px)] flex-col overflow-hidden rounded-3xl border border-ru-n-200 bg-white shadow-[0_30px_70px_rgba(9,23,41,0.28)]"
    >
      <div className="flex flex-none items-start gap-3 border-b border-ru-n-100 bg-white p-4.5">
        <span className="relative size-12 flex-none">
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ru-n-100 text-ru-n-400">
            <PersonGlyph />
          </span>
          <span className="absolute -right-px -bottom-px size-3.25 rounded-full border-[2.5px] border-white bg-wa-green" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="mb-1.75 flex flex-wrap items-center gap-2.25">
            <span className="font-display text-xl font-bold tracking-[-0.025em] text-ru-n-700">
              {companyName}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ru-green-100 bg-ru-green-50 px-2.25 py-0.75 text-xs font-semibold text-ru-green-600">
              <span className="size-1.5 rounded-full bg-current" />
              Online
            </span>
          </div>
          <div className="text-[14.5px]/[1.45] text-ru-n-500">
            Ask us anything. We usually reply within a few minutes.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Minimise"
          className="inline-flex size-10 flex-none cursor-pointer items-center justify-center rounded-[10px] border border-ru-n-200 bg-white text-ru-n-500 transition-colors hover:border-ru-n-300 hover:text-ru-n-700"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4.5"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      <div ref={scrollableRef} className="min-h-0 flex-1 overflow-y-auto bg-ru-n-50 p-4.5">
        {tab === "chat" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-end gap-2.5">
              <span className="inline-flex size-8.5 flex-none items-center justify-center rounded-[10px] bg-ru-blue-950 text-white">
                <ChatGlyph className="size-4.25" />
              </span>
              <div>
                <div className="rounded-[16px_16px_16px_5px] border border-ru-n-200 bg-white px-3.75 py-3 text-[15.5px]/[1.5] text-ru-n-700">
                  How can we help you?
                </div>
                <div className="mt-1.25 text-xs text-ru-n-400">{botTime}</div>
              </div>
            </div>

            {/* Only while nothing has been said yet — once the visitor speaks, their own words
                stand in for the openers and the chips would just crowd the thread. */}
            {icebreakers.length > 0 && messages.length === 0 && pendingMessages.length === 0 && (
              <div className="flex flex-wrap justify-end gap-2">
                {icebreakers.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => sendMessage(question)}
                    className="cursor-pointer rounded-full border border-ru-n-200 bg-white px-3.5 py-2 text-left text-[14.5px]/[1.35] text-ru-n-600 transition-colors hover:border-ru-blue-600 hover:text-ru-blue-600"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}

            {messages.slice(0, ackSplit).map((message, i) => renderMessage(message, i))}

            {pendingMessages.map((pending, i) => (
              <div
                key={`pending-${i}`}
                className="max-w-[86%] self-end rounded-[16px_16px_5px_16px] bg-ru-blue-600 px-3.75 py-3 text-[15.5px]/[1.5] text-white"
              >
                {renderWhatsAppMarkup(pending.body)}
                <div className="mt-1 text-[11.5px] opacity-[0.72]">{pending.time}</div>
              </div>
            ))}

            {/* Asked for only once they have said something. The contact API is keyed on phone
                number, so the message they already typed waits in `pendingMessages` and is
                posted the moment this card is filled in. */}
            {!contactId && askForContact && (
              <form
                onSubmit={handleContactSubmit}
                className="rounded-2xl border border-ru-n-200 bg-white p-4"
              >
                <div className="mb-3.5 text-[15.5px]/[1.5] text-ru-n-700">
                  Thanks — where should we reply?
                </div>
                <div className="flex flex-col gap-2.5">
                  <Controller
                    name="name"
                    control={form.control}
                    rules={{ validate: required("Name is required") }}
                    render={({ field, fieldState }) => (
                      <div>
                        <input {...field} placeholder="Your name" className={FIELD} />
                        {fieldState.error && (
                          <div className={ERROR_TEXT}>{fieldState.error.message}</div>
                        )}
                      </div>
                    )}
                  />
                  <Controller
                    name="phone"
                    control={form.control}
                    rules={{ validate: validPhone }}
                    render={({ field, fieldState }) => (
                      <div>
                        <Suspense fallback={<div className="h-9 w-full" />}>
                          <WidgetPhoneInput
                            defaultCountry="IN"
                            international
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            placeholder="WhatsApp number"
                            className="w-full"
                          />
                        </Suspense>
                        {fieldState.error && (
                          <div className={ERROR_TEXT}>{fieldState.error.message}</div>
                        )}
                      </div>
                    )}
                  />
                  <Controller
                    name="email"
                    control={form.control}
                    rules={{ validate: (value) => !value || validEmail(value) }}
                    render={({ field, fieldState }) => (
                      <div>
                        <input
                          {...field}
                          type="email"
                          placeholder="Email (optional)"
                          className={FIELD}
                        />
                        {fieldState.error && (
                          <div className={ERROR_TEXT}>{fieldState.error.message}</div>
                        )}
                      </div>
                    )}
                  />
                  <button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="h-12.5 cursor-pointer rounded-xl bg-ru-blue-600 text-[15.5px] font-bold text-white transition-colors hover:bg-ru-blue-700 disabled:opacity-60"
                  >
                    Send to the team
                  </button>
                </div>
              </form>
            )}

            {ack && (
              <div className="flex items-end gap-2.5">
                <span className="inline-flex size-8.5 flex-none items-center justify-center rounded-[10px] bg-ru-blue-950 text-white">
                  <ChatGlyph className="size-4.25" />
                </span>
                <div className="max-w-[86%]">
                  <div className="rounded-[16px_16px_16px_5px] border border-ru-n-200 bg-white px-3.75 py-3 text-[15.5px]/[1.5] text-ru-n-700">
                    Got it, {ack.name} — a human will come back to you shortly. For a faster reply,
                    ping us on WhatsApp.
                  </div>
                  <div className="mt-1.25 text-xs text-ru-n-400">{timeLabel(new Date(ack.at))}</div>
                </div>
              </div>
            )}

            {/* Anything that landed after the acknowledgement — a real reply from the inbox,
                which used to render above it because the bubble was pinned to the bottom. */}
            {messages.slice(ackSplit).map((message, i) => renderMessage(message, ackSplit + i))}

            <div ref={targetRef} />
          </div>
        ) : tab === "whatsapp" ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-ru-n-200 bg-white p-4.5">
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className="inline-flex size-8 flex-none items-center justify-center rounded-[9px] bg-wa-green text-white">
                  <WhatsAppMark className="size-5" />
                </span>
                <span className="font-display text-[17.5px] font-bold tracking-[-0.02em] text-ru-n-700">
                  Chat on WhatsApp
                </span>
              </div>
              <p className="mb-4 text-[15px]/[1.55] text-ru-n-500">
                The fastest way to reach us — same team, replies straight to your phone.
              </p>
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="flex h-13 items-center justify-center gap-2.5 rounded-xl bg-ru-green-500 text-base font-bold text-white transition-colors hover:bg-ru-green-600"
              >
                <WhatsAppMark className="size-5" />
                Open WhatsApp
              </a>
            </div>

            {/* A real code for the same `wa.me` link the button opens. */}
            <div className="flex items-start gap-3.5 rounded-2xl border border-ru-n-200 bg-white p-4">
              <div className="size-22 flex-none rounded-[10px] border border-ru-n-200 bg-white p-1.75">
                {qr && <img src={qr} alt="" className="size-full" />}
              </div>
              <p className="text-[14.5px]/[1.5] text-ru-n-500">
                On desktop? Scan this with your phone camera to open the same conversation.
              </p>
            </div>
          </div>
        ) : (
          <div>
            {emailSent ? (
              <div className="rounded-2xl border border-ru-n-200 bg-white p-5.5 text-center">
                <span className="mb-3.5 inline-flex size-11.5 items-center justify-center rounded-full border border-ru-green-100 bg-ru-green-50 text-ru-green-600">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-5.5"
                    aria-hidden="true"
                  >
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                </span>
                <div className="mb-2 font-display text-lg font-bold tracking-[-0.02em] text-ru-n-700">
                  Message sent
                </div>
                <p className="text-[14.5px]/[1.5] text-ru-n-500">
                  We&apos;ll be in touch within one business day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
                <Controller
                  name="name"
                  control={emailForm.control}
                  rules={{ validate: required("Name is required") }}
                  render={({ field, fieldState }) => (
                    <div>
                      <input {...field} placeholder="Name" className={FIELD} />
                      {fieldState.error && (
                        <div className={ERROR_TEXT}>{fieldState.error.message}</div>
                      )}
                    </div>
                  )}
                />
                <Controller
                  name="email"
                  control={emailForm.control}
                  rules={{ validate: validEmail }}
                  render={({ field, fieldState }) => (
                    <div>
                      <input {...field} type="email" placeholder="Email" className={FIELD} />
                      {fieldState.error && (
                        <div className={ERROR_TEXT}>{fieldState.error.message}</div>
                      )}
                    </div>
                  )}
                />
                {/* The design tucks the send button inside the textarea, hence the tall
                    bottom padding — the text must not run under it. */}
                <Controller
                  name="message"
                  control={emailForm.control}
                  rules={{ validate: required("Message is required") }}
                  render={({ field, fieldState }) => (
                    <div>
                      <div className="relative">
                        <textarea
                          {...field}
                          rows={5}
                          placeholder="Message"
                          className="w-full resize-y rounded-xl border border-ru-n-200 bg-white px-3.5 pt-3.5 pb-16.5 text-[15.5px]/[1.55] text-ru-n-700 outline-none transition-colors placeholder:text-ru-n-400 focus:border-ru-blue-600"
                        />
                        <button
                          type="submit"
                          aria-label="Send"
                          disabled={emailForm.formState.isSubmitting}
                          className="absolute right-3 bottom-3.5 inline-flex h-12 w-14 cursor-pointer items-center justify-center rounded-xl bg-ru-blue-950 text-white transition-transform hover:-translate-y-px disabled:opacity-60"
                        >
                          <SendGlyph className="size-5.5" />
                        </button>
                      </div>
                      {fieldState.error && (
                        <div className={ERROR_TEXT}>{fieldState.error.message}</div>
                      )}
                    </div>
                  )}
                />
                {emailForm.formState.errors.root && (
                  <div className={ERROR_TEXT}>{emailForm.formState.errors.root.message}</div>
                )}
                <div className="text-[13px] text-ru-n-400">
                  We reply to every email within one business day.
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {tab === "chat" && (
        <div className="flex-none border-t border-ru-n-100 bg-ru-n-50 px-3.5 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2.5 rounded-[14px] border border-ru-n-200 bg-white p-1.5 pl-3.5"
          >
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Write a message"
              aria-label="Write a message"
              className="h-11 min-w-0 flex-1 border-none bg-transparent text-[15.5px] text-ru-n-700 outline-none placeholder:text-ru-n-400"
            />
            <button
              type="submit"
              aria-label="Send"
              className="inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-[11px] bg-ru-blue-600 text-white transition-colors hover:bg-ru-blue-700"
            >
              <SendGlyph />
            </button>
          </form>
        </div>
      )}

      <div className="flex flex-none border-t border-ru-n-100 bg-white">
        {(
          [
            { id: "chat", label: "Chat", icon: <ChatGlyph /> },
            { id: "whatsapp", label: "WhatsApp", icon: <WhatsAppMark className="size-5" /> },
            { id: "email", label: "Email", icon: <MailGlyph /> },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id}
            className={`inline-flex h-15 flex-1 cursor-pointer flex-col items-center justify-center gap-1 border-none bg-transparent text-[11.5px] font-semibold transition-colors ${
              tab === item.id
                ? "text-ru-blue-600 shadow-[inset_0_2px_0_0_currentColor]"
                : "text-ru-n-400 hover:text-ru-n-600"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
