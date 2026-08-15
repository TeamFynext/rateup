import { create } from "zustand";

import type { TiptapNode } from "@/components/RichTextEditor/wa-editor/format.tsx";
import type { WaTemplateComponent, WaTemplateFetchBody } from "@/types/global";

/**
 * Messages the composer has handed to the API but that the thread has not read back
 * yet. They render as ordinary outgoing bubbles with a clock instead of a tick, so
 * sending shows something immediately rather than after the round-trip.
 *
 * Keyed by the thread's row key (`getRowKey(contact)`) — the same key the message
 * store uses — so a pending bubble belongs to one ticket and does not follow the
 * contact onto another.
 *
 * The sender is responsible for clearing its own entry, and should do that only once
 * the refetched thread contains the real message; dropping it the moment the request
 * resolves leaves a gap where neither bubble is on screen.
 */

interface PendingBase {
  id: string;
  /** `Date.now()` when the send started. */
  timestamp: number;
}

/** A composed message: text, media, or both. */
export interface PendingComposedMessage extends PendingBase {
  kind: "message";
  body: {
    /** The composer's Tiptap document, or plain text. */
    text?: TiptapNode | string;
    url?: string;
    urlType?: string;
    filename?: string;
  };
}

/** A template send, carrying what the preview needs to draw the same card. */
export interface PendingTemplateMessage extends PendingBase {
  kind: "template";
  template: WaTemplateFetchBody;
  parameters: WaTemplateComponent[];
}

/** A flow send: the flow's own invitation message and its button label. */
export interface PendingFlowMessage extends PendingBase {
  kind: "flow";
  text: string;
  cta?: string;
}

export type PendingMessage = PendingComposedMessage | PendingTemplateMessage | PendingFlowMessage;

type NewPendingMessage =
  | Omit<PendingComposedMessage, "id" | "timestamp">
  | Omit<PendingTemplateMessage, "id" | "timestamp">
  | Omit<PendingFlowMessage, "id" | "timestamp">;

interface PendingMessagesState {
  pendingByRow: Record<string, PendingMessage[]>;
  /** Adds a bubble and hands back its id, which is what clears it again. */
  addPendingMessage: (rowKey: string, message: NewPendingMessage) => string;
  /** Clears one bubble, or the row's whole queue when no id is given. */
  removePendingMessage: (rowKey: string, id?: string) => void;
  getPendingMessages: (rowKey: string) => PendingMessage[];
}

let pendingCounter = 0;

export const usePendingMessagesStore = create<PendingMessagesState>((set, get) => ({
  pendingByRow: {},
  addPendingMessage: (rowKey, message) => {
    const id = `pending-${++pendingCounter}`;
    set((state) => ({
      pendingByRow: {
        ...state.pendingByRow,
        [rowKey]: [
          ...(state.pendingByRow[rowKey] ?? []),
          { ...message, id, timestamp: Date.now() } as PendingMessage,
        ],
      },
    }));
    return id;
  },
  removePendingMessage: (rowKey, id) =>
    set((state) => {
      const current = state.pendingByRow[rowKey] ?? [];
      const next = id ? current.filter((message) => message.id !== id) : [];
      return { pendingByRow: { ...state.pendingByRow, [rowKey]: next } };
    }),
  getPendingMessages: (rowKey) => get().pendingByRow[rowKey] ?? [],
}));
