"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { schemaResolver, useForm } from "@mantine/form";
import { useClickOutside, useScrollIntoView } from "@mantine/hooks";
import axios from "axios";
import { isValidPhoneNumber } from "libphonenumber-js";
import {
  ArrowRight,
  Home,
  MessageCircle,
  Minus,
  MoreHorizontal,
  Send,
  Smile,
} from "lucide-react";
import { z } from "zod/v4";

import { getBrowserId } from "@/lib/browserId";
import { WA_INBOX_WEBSOCKET_CONNECTION_STRING } from "@/backend/org/ws/org.ws.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import PhoneInputWithCountry from "../input/PhoneInputWithCountry";
import { parseWhatsAppToReact } from "../RichTextEditor/waTextEditor";
import { Label } from "../ui/label";

interface SupportWidgetProps {
  whatsappNumber?: string;
  companyName?: string;
  orgId: string;
  token: string;
  backendUrl?: string;
  webhookUrl?: string;
}
type Message = {
  id: string;
  messageBody: {
    exchangeProcess: "send" | "receive";
    send: {
      id: string;
      text: {
        body: string;
      };
      type: string;
      timestamp: string;
    } | null;
    receive: {
      messages: [
        {
          id: string;
          text: {
            body: string;
          };
          type: string;
          timestamp: string;
        },
      ];
    } | null;
  };
};

const supportSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().refine(isValidPhoneNumber, {
    message: "Invalid phone number",
  }),
  email: z.email("Invalid email"),
});

export default function SupportWidget({
  whatsappNumber = "+919633654012",
  companyName = "Team RateUp",
  orgId,
  token,
  backendUrl,
  webhookUrl,
}: Readonly<SupportWidgetProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<"contact" | "whatsapp">("contact");
  const [newMessage, setNewMessage] = useState("");
  const [contactId, setContactId] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const browserId = getBrowserId();
  const router = useRouter();
  const { scrollIntoView, targetRef, scrollableRef } = useScrollIntoView<
    HTMLDivElement,
    HTMLDivElement
  >({
    duration: 0,
  });
  const ref = useClickOutside(() => setIsOpen(false));
  const API_URL = backendUrl || process.env.NEXT_PUBLIC_API_URL;
  const WEBHOOK_URL =
    webhookUrl ||
    `${WA_INBOX_WEBSOCKET_CONNECTION_STRING}/${browserId}/ws/${orgId}?role=fab`;
  const queryParams = orgId ? `?orgId=${orgId}` : "";

  const form = useForm<z.infer<typeof supportSchema>>({
    initialValues: {
      name: "",
      phone: "",
      email: "",
    },
    validate: schemaResolver(supportSchema, {
      sync: true,
    }),
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      messageBody: {
        receive: null,
        send: {
          text: {
            body: "Hello! How can We help you?",
          },
          timestamp: new Date().getTime()?.toString() || "",
          id: "msg1",
          type: "text",
        },
        exchangeProcess: "send",
      },
    },
  ]);

  // Extracted message handler to reduce nesting
  function handleWebSocketMessage(event: MessageEvent) {
    const message = JSON.parse(event.data);
    setMessages((prev) => [...prev, message?.inbox?.message]);
  }

  useEffect(() => {
    if (!browserId) return;

    let ws: WebSocket | null = null;
    let closedByUser = false;

    function connect() {
      ws = new WebSocket(WEBHOOK_URL);
      socketRef.current = ws;

      ws.onmessage = handleWebSocketMessage;

      ws.onclose = () => {
        console.log("WebSocket closed");
        if (!closedByUser && retryCountRef.current < 5) {
          retryCountRef.current += 1;
          setTimeout(connect, 1000); // retry after 1s
        }
      };
    }

    connect();

    return () => {
      closedByUser = true;
      ws?.close();
    };
  }, [WEBHOOK_URL, browserId, orgId, router]);

  const storedContactId = localStorage.getItem("support_contact_id");
  useEffect(() => {
    if (storedContactId) {
      setContactId(storedContactId);
      setCurrentStep(2);
    }
    if (!storedContactId) return;
    fetch(`${API_URL}/api/support/contact/${storedContactId}${queryParams}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((json) => {
        setMessages((prev) => [...prev, ...(json || [])]);
      });
  }, [token, storedContactId, API_URL, orgId]);

  useEffect(() => {
    scrollIntoView();
  }, [messages]);

  const handleNext = async () => {
    if (form.validate().hasErrors) return;
    const values = {
      ...form.values,
      phone: form.values.phone.replace("+", ""),
    };

    try {
      const res = await axios.post(
        `${API_URL}/api/support/contact${queryParams}`,
        values,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const newContactId = res.data;
      localStorage.setItem("support_contact_id", newContactId);
      localStorage.setItem("support_contact_name", values.phone);
      setContactId(newContactId);
      setCurrentStep(2);
      setActiveTab("contact");
    } catch (error) {
      console.error(error);
    }
  };

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(`Hello! I need support.`);
    window.open(
      `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${message}`,
      "_blank",
    );
  };

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      setNewMessage("");

      // Send message to API
      try {
        const support_contact_id = localStorage.getItem("support_contact_id");
        const support_contact_name = localStorage.getItem(
          "support_contact_name",
        );
        const phone = support_contact_name;
        if (!support_contact_id) return;
        const timestamp = Math.floor(Date.now() / 1000);

        const messageBody = {
          object: "support_user",
          entry: [
            {
              id: support_contact_id,
              changes: [
                {
                  value: {
                    messages: [
                      {
                        from: phone,
                        id: `webid.chat${phone}FQIAERgS${Buffer.from(phone).toString("base64").slice(0, 22)}AA==`,
                        timestamp: timestamp.toString(),
                        text: {
                          body: newMessage,
                        },
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error("Error sending message:", error);
        // Optionally handle error (e.g., show notification)
      }
    }
  };

  return (
    <div className="fixed right-1 bottom-8 sm:right-8 z-50">
      {isOpen ? (
        <div
          className="transition-all duration-500 ease-in-out transform scale-100 opacity-100 animate-fade-in"
          ref={ref}
        >
          <div className="w-96 h-[550px] bg-background/80 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-border animate-slide-up dark:bg-background/90">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/90">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-linear-to-br from-[#66D7FF] to-[#2D74E0] flex items-center justify-center">
                  <span className="text-white font-bold text-base">
                    {companyName[0]}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">
                    {companyName} 👋
                  </div>
                  <div className="text-xs text-muted-foreground">Support</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 text-muted-foreground hover:bg-muted transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as any)}
              className="w-full h-full px-4"
            >
              <TabsContent value="contact" className="flex flex-col">
                {currentStep === 1 && !contactId && (
                  <div className="px-4 py-6 space-y-6 animate-fade-in">
                    <h2 className="text-lg font-bold text-foreground mb-1">
                      Welcome!
                    </h2>
                    <p className="text-muted-foreground mb-4 text-sm">
                      Let us know how we can help you today.
                    </p>
                    <form
                      onSubmit={form.onSubmit(handleNext)}
                      className="space-y-3"
                    >
                      <div className="relative">
                        <Label className="text-xs font-medium text-muted-foreground mb-1">
                          Name <span className="text-orange-500">*</span>
                        </Label>
                        <div className="flex items-center bg-background rounded-lg shadow-sm border border-border px-2">
                          <Smile className="h-4 w-4 text-muted-foreground mr-1" />
                          <input
                            {...form.getInputProps("name")}
                            className="flex-1 bg-transparent h-8 text-sm px-1 outline-none border-none"
                            placeholder="Your name"
                          />
                        </div>
                        {form.errors.name && (
                          <div className="text-xs text-red-500 mt-1">
                            {form.errors.name}
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <Label className="text-xs font-medium text-muted-foreground mb-1">
                          Phone <span className="text-orange-500">*</span>
                        </Label>
                        <div className="flex items-center bg-background rounded-lg shadow-sm border border-border">
                          <PhoneInputWithCountry
                            defaultCountry="IN"
                            international
                            value={form.values.phone}
                            onChange={(e) => form.setFieldValue("phone", e)}
                            borderRadius={8}
                            className="flex-1 border-0 bg-transparent focus:ring-0 focus:outline-none h-8 text-sm px-1"
                            placeholder="Phone number"
                            required
                          />
                        </div>
                        {form.errors.phone && (
                          <div className="text-xs text-red-500 mt-1">
                            {form.errors.phone}
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <Label className="text-xs font-medium text-muted-foreground mb-1">
                          Email <span className="text-orange-500">*</span>
                        </Label>
                        <div className="flex items-center bg-background rounded-lg shadow-sm border border-border px-2">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground mr-1" />
                          <input
                            type="email"
                            {...form.getInputProps("email")}
                            className="flex-1 border-0 bg-transparent focus:ring-0 focus:outline-none h-8 text-sm px-1"
                            placeholder="Email address"
                            required
                          />
                        </div>
                        {form.errors.email && (
                          <div className="text-xs text-red-500 mt-1">
                            {form.errors.email}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button
                          type="submit"
                          disabled={
                            form.isDirty && Object.keys(form.errors).length > 0
                          }
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-full shadow disabled:opacity-50 text-xs h-8 min-w-[70px] transition-transform duration-200 hover:scale-105"
                          size="sm"
                        >
                          Next <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
                {contactId && (
                  <>
                    <div className="flex-1 ">
                      <div
                        style={{ maxHeight: 370, overflowX: "scroll" }}
                        ref={scrollableRef}
                      >
                        <div className="py-4 pr-2 space-y-3 animate-fade-in">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex items-end gap-2 ${message.messageBody?.exchangeProcess === "receive" ? "justify-end" : ""}`}
                            >
                              {message.messageBody?.exchangeProcess ===
                                "send" && (
                                <div className="h-7 w-7 rounded-full bg-linear-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 animate-pop-in">
                                  <div className="h-3 w-3 bg-white rounded-sm"></div>
                                </div>
                              )}
                              <div
                                className={`flex flex-col ${message.messageBody?.exchangeProcess === "receive" ? "ml-auto" : ""}`}
                              >
                                <div
                                  className={`px-3 py-2 rounded-2xl max-w-xs shadow transition-all duration-300 text-xs ${message.messageBody?.exchangeProcess === "receive" ? "bg-blue-600 text-white ml-auto animate-pop-in" : "bg-linear-to-br from-muted via-background to-muted text-foreground animate-pop-in"}`}
                                >
                                  <p className="leading-relaxed">
                                    {parseWhatsAppToReact(
                                      message.messageBody?.receive
                                        ?.messages?.[0]?.text?.body ||
                                        message.messageBody?.send?.text?.body,
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div ref={targetRef} />
                      </div>
                    </div>
                    <div className="px-1 pt-3 border-t border-border bg-background/90 backdrop-blur-lg">
                      <div className="flex w-full max-w-sm items-center gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleSendMessage()
                          }
                        />
                        <Button size="sm">
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
              <TabsContent value="whatsapp">
                {/* Help tab content */}
                <div className="px-4 py-6 space-y-6 flex flex-col items-center justify-center animate-fade-in h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-green-500 rounded-full p-2">
                      <MessageCircle className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-semibold text-foreground text-base">
                      Reach us on WhatsApp!
                    </span>
                  </div>
                  <p className="text-muted-foreground text-center text-sm mb-4">
                    Start a conversation using the button below and we will try
                    to reply as soon as possible.
                  </p>
                  <Button
                    onClick={handleWhatsAppClick}
                    className="w-full h-10 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center gap-2 shadow text-base transition-transform duration-200 hover:scale-105"
                    size="lg"
                  >
                    Open WhatsApp <Send className="h-4 w-4" />
                  </Button>
                  <div className="mt-6 text-xs text-muted-foreground flex items-center gap-1">
                    We run on Rateup{" "}
                    <span className="inline-block">
                      <Home className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </TabsContent>
              <TabsList className="w-full mb-4 h-10">
                <TabsTrigger
                  value="contact"
                  className="transition-colors duration-200 data-[state=active]:bg-[#1c518e] data-[state=active]:text-white"
                >
                  <MessageCircle className="h-4 w-4" /> Chat
                </TabsTrigger>
                <TabsTrigger
                  value="whatsapp"
                  className="transition-colors duration-200 data-[state=active]:bg-[#1c518e] data-[state=active]:text-white"
                >
                  <Send className="h-4 w-4" /> Whatsapp
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="bg-linear-to-br from-[#66D7FF] to-[#2D74E0] hover:from-[#00bbff] hover:to-[#005de9] text-white rounded-full shadow-2xl w-16 h-16 flex items-center justify-center focus:outline-none transition-transform duration-300 hover:scale-105 animate-bounce-in border-2 border-background"
            aria-label="Open chat"
          >
            <MessageCircle className="h-8 w-8" />
          </button>
        </div>
      )}
    </div>
  );
}
