"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useForm } from "@mantine/form";
import {
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconCheck,
  IconLayoutGrid,
  IconSearch,
  IconTemplate,
  IconX,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AutomationPlatform } from "@/types/platform";
import { AccountSelector } from "@/components/input/AccountSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  useCreateWaAutomatedReplyMutation,
  useUpdateWaAutomatedReplyMutation,
} from "../../../../backend/whatsapp/automated-reply/automatedReply.query";
import {
  useCreateInstagramAutomationMutation,
  useUpdateInstagramAutomationMutation,
} from "../../../../backend/whatsapp/instagram-automation/instagramAutomation.query";
import { ContainedTextField } from "../../../../components/input/ContainedInput/ContainedInput";
import { WaAutomatedReply } from "../../../../types/global";

// ─── Demo Templates ────────────────────────────────────────────────────────────

const DEMO_TEMPLATES = [
  {
    id: "tpl-001",
    name: "Welcome & Main Menu Bot",
    description: "Greets users and provides main navigation options.",
    platform: AutomationPlatform.WHATSAPP,
    tags: ["Welcome", "Menu"],
    nodeCount: 5,
    matchData: {
      json: {
        edges: [
          {
            id: "e1",
            source: "start",
            target: "menu",
            sourceHandle: "right",
            targetHandle: "left",
            type: "custom",
          },
          { id: "e2", source: "menu", target: "sales", sourceHandle: "btn1" },
          { id: "e3", source: "menu", target: "support", sourceHandle: "btn2" },
          { id: "e4", source: "menu", target: "about", sourceHandle: "btn3" },
        ],
        nodes: [
          {
            id: "start",
            type: "startNode",
            position: { x: 100, y: 100 },
            data: { label: "Start" },
          },
          {
            id: "menu",
            type: "buttonNode",
            position: { x: 300, y: 100 },
            data: {
              header: "Welcome 👋",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "How can we help you today?" },
                    ],
                  },
                ],
              },
              buttons: [
                { id: "btn1", title: "Sales" },
                { id: "btn2", title: "Support" },
                { id: "btn3", title: "About Us" },
              ],
              platform: "whatsapp",
            },
          },
          {
            id: "sales",
            type: "textNode",
            position: { x: 550, y: 0 },
            data: {
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Our team will contact you for sales.",
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            id: "support",
            type: "textNode",
            position: { x: 550, y: 120 },
            data: {
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Please describe your issue." },
                    ],
                  },
                ],
              },
            },
          },
          {
            id: "about",
            type: "textNode",
            position: { x: 550, y: 240 },
            data: {
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "We are a global service provider.",
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
      },
      caseSensitive: false,
    },
  },
  {
    id: "tpl-002",
    name: "Lead Capture Bot",
    description: "Captures user interest and qualifies leads.",
    platform: AutomationPlatform.WHATSAPP,
    tags: ["Leads", "Sales"],
    nodeCount: 4,
    matchData: {
      json: {
        edges: [
          { id: "e1", source: "start", target: "askInterest" },
          {
            id: "e2",
            source: "askInterest",
            target: "yesLead",
            sourceHandle: "btn1",
          },
          {
            id: "e3",
            source: "askInterest",
            target: "noLead",
            sourceHandle: "btn2",
          },
        ],
        nodes: [
          {
            id: "start",
            type: "startNode",
            position: { x: 100, y: 100 },
            data: { label: "Start" },
          },
          {
            id: "askInterest",
            type: "buttonNode",
            position: { x: 300, y: 100 },
            data: {
              header: "Quick Question",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Are you interested in our services?",
                      },
                    ],
                  },
                ],
              },
              buttons: [
                { id: "btn1", title: "Yes" },
                { id: "btn2", title: "No" },
              ],
              platform: "whatsapp",
            },
          },
          {
            id: "yesLead",
            type: "textNode",
            position: { x: 550, y: 0 },
            data: {
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Great! Please share your contact details.",
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            id: "noLead",
            type: "textNode",
            position: { x: 550, y: 150 },
            data: {
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "No problem! Let us know if you need anything.",
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
      },
      caseSensitive: false,
    },
  },
  {
    id: "tpl-003",
    name: "Appointment Booking Bot",
    description: "Helps users book appointments quickly.",
    platform: AutomationPlatform.WHATSAPP,
    tags: ["Booking"],
    nodeCount: 4,
    matchData: {
      json: {
        edges: [
          { id: "e1", source: "start", target: "askBooking" },
          {
            id: "e2",
            source: "askBooking",
            target: "bookYes",
            sourceHandle: "btn1",
          },
          {
            id: "e3",
            source: "askBooking",
            target: "bookNo",
            sourceHandle: "btn2",
          },
        ],
        nodes: [
          {
            id: "start",
            type: "startNode",
            position: { x: 100, y: 100 },
            data: { label: "Start" },
          },
          {
            id: "askBooking",
            type: "buttonNode",
            position: { x: 300, y: 100 },
            data: {
              header: "Appointment",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Would you like to book an appointment?",
                      },
                    ],
                  },
                ],
              },
              buttons: [
                { id: "btn1", title: "Book Now" },
                { id: "btn2", title: "Later" },
              ],
              platform: "whatsapp",
            },
          },
          {
            id: "bookYes",
            type: "textNode",
            position: { x: 550, y: 0 },
            data: {
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Please select your preferred date and time.",
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            id: "bookNo",
            type: "textNode",
            position: { x: 550, y: 150 },
            data: {
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "No worries! You can book anytime.",
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
      },
      caseSensitive: false,
    },
  },
  {
    id: "tpl-004",
    name: "FAQ Bot",
    description: "Answers common customer questions automatically.",
    platform: AutomationPlatform.WHATSAPP,
    tags: ["FAQ"],
    nodeCount: 4,
    matchData: {
      json: {
        edges: [
          { id: "e1", source: "start", target: "faqMenu" },
          {
            id: "e2",
            source: "faqMenu",
            target: "pricing",
            sourceHandle: "btn1",
          },
          {
            id: "e3",
            source: "faqMenu",
            target: "hours",
            sourceHandle: "btn2",
          },
        ],
        nodes: [
          {
            id: "start",
            type: "startNode",
            position: { x: 100, y: 100 },
            data: { label: "Start" },
          },
          {
            id: "faqMenu",
            type: "buttonNode",
            position: { x: 300, y: 100 },
            data: {
              header: "FAQs",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Choose a question:" }],
                  },
                ],
              },
              buttons: [
                { id: "btn1", title: "Pricing" },
                { id: "btn2", title: "Working Hours" },
              ],
              platform: "whatsapp",
            },
          },
          {
            id: "pricing",
            type: "textNode",
            position: { x: 550, y: 0 },
            data: {
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Our pricing starts from $10/month.",
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            id: "hours",
            type: "textNode",
            position: { x: 550, y: 150 },
            data: {
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "We are available 9 AM - 6 PM." },
                    ],
                  },
                ],
              },
            },
          },
        ],
      },
      caseSensitive: false,
    },
  },
  {
    id: "tpl-005",
    name: "Customer Feedback Bot",
    description: "Collects customer feedback and satisfaction ratings.",
    platform: AutomationPlatform.WHATSAPP,
    tags: ["Feedback"],
    nodeCount: 4,
    matchData: {
      json: {
        edges: [
          { id: "e1", source: "start", target: "feedbackAsk" },
          {
            id: "e2",
            source: "feedbackAsk",
            target: "good",
            sourceHandle: "btn1",
          },
          {
            id: "e3",
            source: "feedbackAsk",
            target: "bad",
            sourceHandle: "btn2",
          },
        ],
        nodes: [
          {
            id: "start",
            type: "startNode",
            position: { x: 100, y: 100 },
            data: { label: "Start" },
          },
          {
            id: "feedbackAsk",
            type: "buttonNode",
            position: { x: 300, y: 100 },
            data: {
              header: "Feedback",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "How was your experience?" },
                    ],
                  },
                ],
              },
              buttons: [
                { id: "btn1", title: "Good" },
                { id: "btn2", title: "Bad" },
              ],
              platform: "whatsapp",
            },
          },
          {
            id: "good",
            type: "textNode",
            position: { x: 550, y: 0 },
            data: {
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Thank you for your feedback!" },
                    ],
                  },
                ],
              },
            },
          },
          {
            id: "bad",
            type: "textNode",
            position: { x: 550, y: 150 },
            data: {
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "We're sorry. Please tell us how we can improve.",
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
      },
      caseSensitive: false,
    },
  },
  {
    id: "tpl-006",
    name: "Order Tracking Bot",
    description: "Helps users track their orders by ID.",
    platform: AutomationPlatform.WHATSAPP,
    tags: ["Ecommerce"],
    nodeCount: 2,
    matchData: {
      json: {
        edges: [{ id: "e1", source: "start", target: "track" }],
        nodes: [
          {
            id: "start",
            type: "startNode",
            position: { x: 100, y: 100 },
            data: { label: "Start" },
          },
          {
            id: "track",
            type: "textNode",
            position: { x: 300, y: 100 },
            data: {
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Please enter your order ID to track.",
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
      },
      caseSensitive: false,
    },
  },
  {
    id: "tpl-007",
    name: "Promotional Offer Bot",
    description: "Promotes offers and discounts to users.",
    platform: AutomationPlatform.WHATSAPP,
    tags: ["Marketing"],
    nodeCount: 3,
    matchData: {
      json: {
        edges: [
          { id: "e1", source: "start", target: "offer" },
          { id: "e2", source: "offer", target: "claim", sourceHandle: "btn1" },
        ],
        nodes: [
          {
            id: "start",
            type: "startNode",
            position: { x: 100, y: 100 },
            data: { label: "Start" },
          },
          {
            id: "offer",
            type: "buttonNode",
            position: { x: 300, y: 100 },
            data: {
              header: "Special Offer 🎉",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Get 20% OFF on your next purchase!",
                      },
                    ],
                  },
                ],
              },
              buttons: [{ id: "btn1", title: "Claim Now" }],
              platform: "whatsapp",
            },
          },
          {
            id: "claim",
            type: "textNode",
            position: { x: 550, y: 100 },
            data: {
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Coupon applied successfully!" },
                    ],
                  },
                ],
              },
            },
          },
        ],
      },
      caseSensitive: false,
    },
  },
  {
    id: "tpl-008",
    name: "Event Registration Bot",
    description: "Registers users for upcoming events.",
    platform: AutomationPlatform.WHATSAPP,
    tags: ["Events"],
    nodeCount: 3,
    matchData: {
      json: {
        edges: [
          { id: "e1", source: "start", target: "eventAsk" },
          {
            id: "e2",
            source: "eventAsk",
            target: "register",
            sourceHandle: "btn1",
          },
        ],
        nodes: [
          {
            id: "start",
            type: "startNode",
            position: { x: 100, y: 100 },
            data: { label: "Start" },
          },
          {
            id: "eventAsk",
            type: "buttonNode",
            position: { x: 300, y: 100 },
            data: {
              header: "Event 🎤",
              headerType: "text",
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Would you like to join our event?",
                      },
                    ],
                  },
                ],
              },
              buttons: [{ id: "btn1", title: "Register" }],
              platform: "whatsapp",
            },
          },
          {
            id: "register",
            type: "textNode",
            position: { x: 550, y: 100 },
            data: {
              body: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "You are successfully registered!",
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
      },
      caseSensitive: false,
    },
  },
];

// ─── Template Picker Dialog ────────────────────────────────────────────────────

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: (typeof DEMO_TEMPLATES)[0]) => void;
}

function TemplatePicker({
  open,
  onClose,
  onSelect,
}: Readonly<TemplatePickerProps>) {
  // FIX: search state persists across dialog open/close via useRef-backed state
  const searchRef = useRef("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setSearch(searchRef.current);
    } else {
      setSelected(null);
    }
  }, [open]);
  function handleSearchChange(value: string) {
    searchRef.current = value;
    setSearch(value);
  }

  const filtered = DEMO_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase())),
  );

  function handleApply() {
    const tpl = DEMO_TEMPLATES.find((t) => t.id === selected);
    if (tpl) {
      onSelect(tpl);
      onClose();
      // Don't reset selected so user can re-open and see their last pick
    }
  }

  const selectedTemplate = DEMO_TEMPLATES.find((t) => t.id === selected);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <IconTemplate size={20} className="text-primary" />
            Choose a Template
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Pick a pre-built chatbot template to get started quickly.
          </p>
          <div className="relative mt-3">
            <IconSearch
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="pl-9 h-9 text-sm"
              placeholder="Search by name, tag, or description..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <IconX size={14} />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.length === 0 && (
            <div className="col-span-2 flex flex-col items-center justify-center py-12 text-center">
              <IconTemplate
                size={32}
                className="text-muted-foreground/40 mb-3"
              />
              <p className="text-sm font-medium text-muted-foreground">
                No templates found
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Try a different search term
              </p>
            </div>
          )}
          {filtered.map((tpl) => {
            const isSelected = selected === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelected(isSelected ? null : tpl.id)}
                className={`text-left rounded-xl border p-4 transition-all duration-150 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary shadow-sm"
                    : "border-border bg-card hover:border-primary/40 hover:bg-accent/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>

                    {/* FIX: Larger, readable badges + node count info */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <Badge
                        variant="secondary"
                        className="text-xs px-2 py-0.5"
                      >
                        {tpl.platform === AutomationPlatform.WHATSAPP ? (
                          <span className="flex items-center gap-1">
                            <IconBrandWhatsapp size={11} /> WhatsApp
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <IconBrandInstagram size={11} /> Instagram
                          </span>
                        )}
                      </Badge>
                      {tpl.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs px-2 py-0.5"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {/* FIX: Node count shown as preview hint */}
                      <Badge
                        variant="outline"
                        className="text-xs px-2 py-0.5 text-muted-foreground"
                      >
                        <IconLayoutGrid size={10} className="mr-1" />
                        {tpl.nodeCount} nodes
                      </Badge>
                    </div>
                  </div>

                  {/* FIX: Clear selected indicator */}
                  <div
                    className={`shrink-0 mt-0.5 rounded-full p-0.5 transition-all duration-150 ${
                      isSelected
                        ? "bg-primary text-primary-foreground scale-100 opacity-100"
                        : "bg-muted text-muted-foreground scale-75 opacity-30"
                    }`}
                  >
                    <IconCheck size={12} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* FIX: Footer shows selected template name for confirmation */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-2 bg-muted/20">
          <div className="text-sm text-muted-foreground truncate">
            {selectedTemplate ? (
              <span>
                Selected:{" "}
                <span className="font-medium text-foreground">
                  {selectedTemplate.name}
                </span>
              </span>
            ) : (
              <span>No template selected</span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!selected}
              onClick={handleApply}
            >
              Use Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Unsaved Changes Confirmation Dialog ──────────────────────────────────────

interface ConfirmDiscardProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDiscardDialog({
  open,
  onConfirm,
  onCancel,
}: Readonly<ConfirmDiscardProps>) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Discard Changes?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          You have unsaved changes. Are you sure you want to discard them?
        </p>
        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Keep Editing
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
          >
            Discard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Platform Toggle ──────────────────────────────────────────────────────────

interface PlatformToggleProps {
  value: AutomationPlatform;
  onChange: (value: AutomationPlatform) => void;
}

// FIX: Replaced Select dropdown with a clear 2-option toggle for better UX
function PlatformToggle({ value, onChange }: Readonly<PlatformToggleProps>) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Platform</label>
      <div className="flex rounded-lg border bg-muted/30 p-1 gap-1">
        <button
          type="button"
          onClick={() => onChange(AutomationPlatform.WHATSAPP)}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ${
            value === AutomationPlatform.WHATSAPP
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <IconBrandWhatsapp
            size={16}
            className={
              value === AutomationPlatform.WHATSAPP ? "text-green-500" : ""
            }
          />
          WhatsApp
        </button>
        <button
          type="button"
          onClick={() => onChange(AutomationPlatform.INSTAGRAM)}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ${
            value === AutomationPlatform.INSTAGRAM
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <IconBrandInstagram
            size={16}
            className={
              value === AutomationPlatform.INSTAGRAM ? "text-pink-500" : ""
            }
          />
          Instagram
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CreateAutomatedReplyPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Create Chatbot</h1>
        <p className="text-muted-foreground">
          Set up automated replies for your WhatsApp or Instagram conversations.
        </p>
      </div>
      <AutomatedReplyForm />
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getInitialValues(initialValues?: WaAutomatedReply) {
  if (initialValues) return initialValues;
  return {
    name: "",
    platform: AutomationPlatform.WHATSAPP,
    matchData: {
      json: {
        nodes: [
          {
            id: `startNode-${Date.now()}`,
            type: "startNode",
            position: { x: 225, y: 45 },
            data: { label: "Start", type: "startNode", startMessage: "" },
            measured: { width: 220, height: 126 },
          },
        ],
        edges: [],
        viewport: {},
      },
      caseSensitive: false,
    },
    whatsappSettingsPhoneId: null,
  };
}

// ─── Form ──────────────────────────────────────────────────────────────────────

interface AutoPilotFormProps {
  initialValues?: WaAutomatedReply;
  editMode?: boolean;
  close?: () => void;
}

export function AutomatedReplyForm({
  initialValues,
  editMode,
  close,
}: Readonly<AutoPilotFormProps>) {
  // FIX: Added validation rules
  const rootForm = useForm({
    initialValues: getInitialValues(initialValues),
    validate: {
      name: (value) =>
        !value?.trim()
          ? "Chatbot name is required"
          : value.trim().length < 3
            ? "Name must be at least 3 characters"
            : null,
    },
  });

  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  // FIX: Track save success to show inline confirmation
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!initialValues) return;
    rootForm.setInitialValues(getInitialValues(initialValues));
  }, [initialValues]);

  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const waAutomatedReplyId = searchParams.get("waAutomatedReplyId");

  const createMutation = useCreateWaAutomatedReplyMutation();
  const updateMutation = useUpdateWaAutomatedReplyMutation();
  const createInstagramMutation = useCreateInstagramAutomationMutation();
  const updateInstagramMutation = useUpdateInstagramAutomationMutation();

  const isInstagram = rootForm.values.platform === AutomationPlatform.INSTAGRAM;
  const isDirty = rootForm.isDirty();

  // FIX: Guard cancel with confirmation if form has unsaved changes
  function handleCancelClick() {
    if (isDirty) {
      setConfirmDiscardOpen(true);
    } else {
      rootForm.reset();
      close?.();
    }
  }

  function handleConfirmDiscard() {
    setConfirmDiscardOpen(false);
    rootForm.reset();
    close?.();
  }

  function handleSubmitClick() {
    const data = rootForm.values;

    if (editMode) {
      if (isInstagram) {
        updateInstagramMutation.mutate(data, {
          onSuccess: () => {
            qc.invalidateQueries({
              queryKey: [
                "instagramAutomation",
                { automationId: waAutomatedReplyId },
              ],
            });
            toast.success("Instagram Automation updated successfully");
            setSaveSuccess(true);
          },
        });
      } else {
        updateMutation.mutate(data, {
          onSuccess: () => {
            qc.invalidateQueries({
              queryKey: ["waAutomatedReply", { waAutomatedReplyId }],
            });
            toast.success("Automated Reply updated successfully");
            setSaveSuccess(true);
          },
        });
      }
    } else {
      if (isInstagram) {
        createInstagramMutation.mutate(data, {
          onSuccess: () => {
            toast.success("Instagram automation created!");
            setSaveSuccess(true);
          },
          onSettled: () => {
            rootForm.reset();
            close?.();
          },
        });
      } else {
        createMutation.mutate(data, {
          onSuccess: () => {
            toast.success("Chatbot created successfully!");
            setSaveSuccess(true);
          },
          onSettled: () => {
            rootForm.reset();
            close?.();
          },
        });
      }
    }
  }

  function handleTemplateSelect(template: (typeof DEMO_TEMPLATES)[0]) {
    rootForm.setValues({
      name: template.name,
      platform: template.platform,
      matchData: template.matchData,
      whatsappSettingsPhoneId: null,
    });
    rootForm.resetDirty();
    toast.success(`Template "${template.name}" applied!`);
  }

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    createInstagramMutation.isPending ||
    updateInstagramMutation.isPending;

  return (
    <TooltipProvider>
      <TemplatePicker
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onSelect={handleTemplateSelect}
      />
      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onConfirm={handleConfirmDiscard}
        onCancel={() => setConfirmDiscardOpen(false)}
      />

      <form
        onSubmit={rootForm.onSubmit(handleSubmitClick)}
        className="space-y-6"
        noValidate
      >
        <Card>
          {/* FIX: Template button moved into CardHeader as a secondary action */}
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Configure the basic settings for your Chatbot
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTemplatePickerOpen(true)}
              className="shrink-0 flex items-center gap-1.5"
            >
              <IconTemplate size={15} />
              Use Template
            </Button>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* FIX: Validation error shown below name field */}
            <ContainedTextField
              label="Chatbot Name"
              placeholder="e.g. Welcome Bot, Support Bot..."
              required
              {...rootForm.getInputProps("name")}
              error={rootForm.errors.name}
            />

            {/* FIX: Platform toggle instead of dropdown */}
            <PlatformToggle
              value={rootForm.values.platform as AutomationPlatform}
              onChange={(value) => rootForm.setFieldValue("platform", value)}
            />

            {/* FIX: Shortened label with tooltip for explanation */}
            {!isInstagram && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <label className="text-sm font-medium">
                    WhatsApp Account
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help text-xs text-muted-foreground bg-muted rounded-full w-4 h-4 flex items-center justify-center font-medium">
                        ?
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-xs">
                      Only required if this chatbot includes a lead automation
                      step that sends messages via a specific WhatsApp number.
                    </TooltipContent>
                  </Tooltip>
                  <span className="text-xs text-muted-foreground">
                    (Optional)
                  </span>
                </div>
                <AccountSelector
                  optional={true}
                  {...rootForm.getInputProps("whatsappSettingsPhoneId")}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* FIX: Clear visual separation between form and actions */}
        <div className="flex justify-between items-center pt-2">
          {/* Left: Cancel only */}
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancelClick}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>

          {/* Right: Save with proper spinner */}
          <Button type="submit" disabled={isSaving} className="min-w-[120px]">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : saveSuccess && editMode ? (
              <>
                <IconCheck size={16} className="mr-2" />
                Saved
              </>
            ) : (
              "Save Chatbot"
            )}
          </Button>
        </div>
      </form>
    </TooltipProvider>
  );
}
