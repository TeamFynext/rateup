import type { Edge } from "@xyflow/react";

import type { TypedNode } from "@/components/whatsapp/automation/types/node-types.ts";
import type { AutomationPlatform } from "@/types/platform.ts";

import type { ChatbotTriggerKind } from "./triggers.ts";

/** What a chatbot is for. Drives the filter chips in the creation wizard. */
export type ChatbotUseCase =
  | "welcome"
  | "support"
  | "leads"
  | "sales"
  | "bookings"
  | "feedback"
  | "qualification"
  | "growth"
  | "handoff";

/** The chip label of each use case, in the order the wizard lists them. */
export const CHATBOT_USE_CASES: ReadonlyArray<{ value: ChatbotUseCase; label: string }> = [
  { value: "welcome", label: "Welcome" },
  { value: "support", label: "Support" },
  { value: "leads", label: "Lead capture" },
  { value: "sales", label: "Sales" },
  { value: "bookings", label: "Bookings" },
  { value: "feedback", label: "Feedback" },
  { value: "qualification", label: "Qualification" },
  { value: "growth", label: "Growth" },
  { value: "handoff", label: "Handoff" },
];

export interface ChatbotGraph {
  nodes: TypedNode[];
  edges: Edge[];
}

/**
 * A ready-made chatbot offered in the creation wizard. Written as code rather than JSON, so a
 * node type or field that does not exist fails the typecheck.
 */
export interface ChatbotExample {
  /** Stable, e.g. "ig-comment-to-dm". */
  key: string;
  platform: AutomationPlatform;
  useCase: ChatbotUseCase;
  name: string;
  /** One sentence, shown on the card. */
  description: string;
  /** How it usually starts: the "How it starts" option the wizard picks for it. */
  trigger: ChatbotTriggerKind;
  /** Marked "New" in the wizard. */
  isNew?: boolean;
  /** A fresh graph on every call, with new ids for nodes, edges and choices. */
  build: () => ChatbotGraph;
}
