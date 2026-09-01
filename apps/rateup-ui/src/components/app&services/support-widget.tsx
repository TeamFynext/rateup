import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { isValidPhoneNumber } from "libphonenumber-js";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { WA_INBOX_WEBSOCKET_CONNECTION_STRING } from "@/backend/org/ws/org.ws.api";
import { useClickOutside } from "@/hooks/use-click-outside.ts";
import { useScrollIntoView } from "@/hooks/use-scroll-into-view.ts";
import { getBrowserId } from "@/lib/browserId.ts";

import { WhatsAppMark } from "../RateupHomePage/shared/channel-marks.tsx";
import { parseWhatsAppToReact } from "../RichTextEditor/wa-editor/format.tsx";
import { PhoneInput } from "../ui/phone-input.tsx";

/**
 * The support widget, drawn to the marketing design.
 *
 * Two pieces: a launcher (a navy "How can we help you?" pill beside a navy avatar tile) and,
 * once opened, a 384x640 panel with its own header, a scrolling conversation, a composer and
 * a tab bar. Colour comes from the `ru-*` ramp in `globals.css`, which is the same palette the
 * design was drawn against — `--surface-2` is `ru-n-50`, `--border` is `ru-n-200`, `--fg` is
 * `ru-n-700` and `--accent` is `ru-blue-600`.
 *
 * The design also draws an Email tab. It is not built here: there is no email endpoint, and
 * the contact API is keyed on phone number, so the form would have nowhere to post.
 */

interface SupportWidgetProps {
  whatsappNumber?: string;
  companyName?: string;
  orgId: string;
  token: string;
  backendUrl?: string;
  webhookUrl?: string;
}

interface Message {
  id: string;
  messageBody: {
    exchangeProcess: "send" | "receive";
    send: {
      id: string;
      text: { body: string };
      type: string;
      timestamp: string;
    } | null;
    receive: {
      messages: [{ id: string; text: { body: string }; type: string; timestamp: string }];
    } | null;
  };
}

const supportSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().refine(isValidPhoneNumber, { message: "Invalid phone number" }),
  email: z.email("Invalid email"),
});

/* The design's field styling: 50px tall, 12px radius, accent border on focus. */
const FIELD =
  "h-12.5 w-full rounded-xl border border-ru-n-200 bg-white px-3.5 text-[15.5px] text-ru-n-700 outline-none transition-colors placeholder:text-ru-n-400 focus:border-ru-blue-600";

const ERROR_TEXT = "mt-1 text-[12.5px] text-red-600";

function ChatGlyph({ className = "size-5" }: Readonly<{ className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4 4h16v11H9l-5 4V4Z" />
    </svg>
  );
}

function PersonGlyph({ className = "size-6" }: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="8.6" r="3.9" />
      <path d="M4.8 20.2a7.4 7.4 0 0 1 14.4 0" />
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

export default function SupportWidget({
  whatsappNumber = import.meta.env.VITE_SUPPORT_WHATSAPP,
  companyName = "Team RateUp",
  orgId,
  token,
  backendUrl,
  webhookUrl,
}: Readonly<SupportWidgetProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "whatsapp">("chat");
  const [newMessage, setNewMessage] = useState("");
  const [contactId, setContactId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const browserId = getBrowserId();
  const { scrollIntoView, targetRef, scrollableRef } = useScrollIntoView<
    HTMLDivElement,
    HTMLDivElement
  >({ duration: 0 });
  const ref = useClickOutside<HTMLDivElement>(() => setIsOpen(false));
  const API_URL = backendUrl || import.meta.env.VITE_API_URL;
  const WEBHOOK_URL =
    webhookUrl || `${WA_INBOX_WEBSOCKET_CONNECTION_STRING}/${browserId}/ws/${orgId}?role=fab`;
  const queryParams = orgId ? `?orgId=${orgId}` : "";
  const waHref = `https://wa.me/${(whatsappNumber || "").replace(/\D/g, "")}?text=${encodeURIComponent(
    "Hi, I need help with support",
  )}`;

  const form = useForm<z.infer<typeof supportSchema>>({
    resolver: zodResolver(supportSchema),
    defaultValues: { name: "", phone: "", email: "" },
  });

  const [messages, setMessages] = useState<Message[]>([]);

  function handleWebSocketMessage(event: MessageEvent) {
    const message = JSON.parse(event.data);
    setMessages((prev) => [...prev, message?.inbox?.message]);
  }

  useEffect(() => {
    if (!browserId) return;

    let ws: WebSocket | null = null;
    let closedByUser = false;

    function connect(): void {
      if (!orgId || !token) return;
      ws = new WebSocket(WEBHOOK_URL);
      socketRef.current = ws;

      ws.onmessage = handleWebSocketMessage;

      ws.onclose = () => {
        if (!closedByUser && retryCountRef.current < 5) {
          retryCountRef.current += 1;
          setTimeout(connect, 1000);
        }
      };
    }

    connect();

    return () => {
      closedByUser = true;
      ws?.close();
    };
  }, [WEBHOOK_URL, browserId, orgId]);

  useEffect(() => {
    const storedContactId = localStorage.getItem("support_contact_id");
    if (!storedContactId) return;
    setContactId(storedContactId);

    fetch(`${API_URL}/api/support/contact/${storedContactId}${queryParams}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((json) => setMessages((prev) => [...prev, ...(json || [])]))
      .catch((error) => console.error("Could not load the support history", error));
  }, [token, API_URL, orgId]);

  /* Only drawn on the WhatsApp tab, so it is not worth generating until the panel opens. */
  useEffect(() => {
    if (!isOpen || qr) return;
    QRCode.toDataURL(waHref, {
      margin: 0,
      width: 320,
      color: { dark: "#091729", light: "#ffffff" },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [isOpen, qr, waHref]);

  useEffect(() => {
    scrollIntoView();
  }, [messages, contactId, tab]);

  const handleContactSubmit = form.handleSubmit(async (formValues) => {
    const values = { ...formValues, phone: formValues.phone.replace("+", "") };

    try {
      /* Axios, not `fetch`: the route replies with the bare contact id, so it comes back as
         text/plain and `response.json()` would throw on it. */
      const res = await axios.post(`${API_URL}/api/support/contact${queryParams}`, values, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newContactId = res.data;

      localStorage.setItem("support_contact_id", newContactId);
      localStorage.setItem("support_contact_name", values.phone);
      setContactId(newContactId);
    } catch (error) {
      console.error("Could not start the support conversation", error);
    }
  });

  const handleSendMessage = async () => {
    const body = newMessage.trim();
    if (!body) return;
    setNewMessage("");

    try {
      const supportContactId = localStorage.getItem("support_contact_id");
      const phone = localStorage.getItem("support_contact_name") ?? "";
      if (!supportContactId) return;

      /* `btoa`, not `Buffer`: this runs in the browser, where `Buffer` is a Node global that
         nothing here polyfills — reaching for it threw before the request was ever made. */
      const idSuffix = btoa(phone).slice(0, 22);
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
                      id: `webid.chat${phone}FQIAERgS${idSuffix}AA==`,
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

      await axios.post(`${API_URL}/api/support${queryParams}`, messageBody, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (!orgId || !token) return null;

  if (!isOpen) {
    return (
      <div className="fixed right-5.5 bottom-5.5 z-[88] flex items-center gap-3">
        {/* The pill is 240px of chrome over the page; below `sm` the tile carries it alone. */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="hidden h-13 cursor-pointer items-center gap-2.75 rounded-full bg-ru-blue-950 px-5.5 text-base font-semibold text-white shadow-[0_12px_30px_rgba(9,23,41,0.26)] transition-transform hover:-translate-y-px sm:inline-flex"
        >
          <span className="size-2.25 flex-none rounded-full bg-[#4ecb8b]" />
          How can we help you?
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat"
          className="relative size-15.5 flex-none cursor-pointer rounded-[18px] bg-ru-blue-950 text-white/85 shadow-[0_14px_32px_rgba(9,23,41,0.3)] transition-transform hover:-translate-y-px"
        >
          <span className="absolute inset-0 flex items-center justify-center">
            <PersonGlyph className="size-7.5" />
          </span>
          <span className="absolute -right-0.5 -bottom-0.5 size-3.75 rounded-full border-[2.5px] border-ink-25 bg-wa-green" />
        </button>
      </div>
    );
  }

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
              <div className="rounded-[16px_16px_16px_5px] border border-ru-n-200 bg-white px-3.75 py-3 text-[15.5px]/[1.5] text-ru-n-700">
                How can we help you?
              </div>
            </div>

            {messages.map((message, i) =>
              isFromVisitor(message) ? (
                <div
                  key={message?.id ?? i}
                  className="max-w-[86%] self-end rounded-[16px_16px_5px_16px] bg-ru-blue-600 px-3.75 py-3 text-[15.5px]/[1.5] text-white"
                >
                  {parseWhatsAppToReact(messageText(message))}
                </div>
              ) : (
                <div key={message?.id ?? i} className="flex items-end gap-2.5">
                  <span className="inline-flex size-8.5 flex-none items-center justify-center rounded-[10px] bg-ru-blue-950 text-white">
                    <ChatGlyph className="size-4.25" />
                  </span>
                  <div className="max-w-[86%] rounded-[16px_16px_16px_5px] border border-ru-n-200 bg-white px-3.75 py-3 text-[15.5px]/[1.5] text-ru-n-700">
                    {parseWhatsAppToReact(messageText(message))}
                  </div>
                </div>
              ),
            )}

            {/* The design asks for these details after the first message. The contact API is
                keyed on phone number and a message cannot be posted without a contact, so the
                card comes first here instead — same card, one step earlier. */}
            {!contactId && (
              <form
                onSubmit={handleContactSubmit}
                className="rounded-2xl border border-ru-n-200 bg-white p-4"
              >
                <div className="mb-3.5 text-[15.5px]/[1.5] text-ru-n-700">
                  Where should we reply?
                </div>
                <div className="flex flex-col gap-2.5">
                  <Controller
                    name="name"
                    control={form.control}
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
                    render={({ field, fieldState }) => (
                      <div>
                        <PhoneInput
                          defaultCountry="IN"
                          international
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="WhatsApp number"
                          className="w-full"
                        />
                        {fieldState.error && (
                          <div className={ERROR_TEXT}>{fieldState.error.message}</div>
                        )}
                      </div>
                    )}
                  />
                  <Controller
                    name="email"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <div>
                        <input {...field} type="email" placeholder="Email" className={FIELD} />
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
            <div ref={targetRef} />
          </div>
        ) : (
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

            {/* The design carries a QR placeholder here. `qrcode` is already a dependency, so
                this is a real code for the same `wa.me` link the button opens. */}
            <div className="flex items-start gap-3.5 rounded-2xl border border-ru-n-200 bg-white p-4">
              <div className="size-22 flex-none rounded-[10px] border border-ru-n-200 bg-white p-1.75">
                {qr && <img src={qr} alt="" className="size-full" />}
              </div>
              <p className="text-[14.5px]/[1.5] text-ru-n-500">
                On desktop? Scan this with your phone camera to open the same conversation.
              </p>
            </div>
          </div>
        )}
      </div>

      {tab === "chat" && contactId && (
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
