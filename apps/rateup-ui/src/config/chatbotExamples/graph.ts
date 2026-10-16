import type { Edge } from "@xyflow/react";

import type {
  NodeType,
  NodeTypeMap,
  TypedNode,
} from "@/components/whatsapp/automation/types/node-types.ts";
import { getLayoutedElements } from "@/components/whatsapp/automation/utils/auto-layout.ts";

import type { ChatbotGraph } from "./types.ts";

/**
 * Builds an example chatbot's graph a node at a time, so each example reads as its
 * conversation rather than as a list of ids and coordinates.
 *
 * Every node, edge and choice gets a `crypto.randomUUID()` id: the engines match a tapped
 * button or quick reply on its id, so two chatbots made from one example must not share them.
 * Positions come from the editor's own auto-layout.
 */
export function createGraph() {
  const nodes: TypedNode[] = [];
  const edges: Edge[] = [];

  function add<T extends NodeType>(type: T, data: NodeTypeMap[T]): string {
    const id = crypto.randomUUID();
    // `TypedNode` is the union over every node type; TypeScript cannot narrow a generic
    // `T` into it, but `{ type: T; data: NodeTypeMap[T] }` is one member of it by definition.
    nodes.push({ id, type, position: { x: 0, y: 0 }, data } as TypedNode);
    return id;
  }

  /** Joins two nodes. `handle` is the choice the branch hangs off; omit it for "then". */
  function connect(source: string, target: string, handle = "right") {
    edges.push({
      id: crypto.randomUUID(),
      type: "custom",
      source,
      target,
      sourceHandle: handle,
      targetHandle: "left",
    });
  }

  /** Joins a chain of nodes, each to the next. */
  function chain(...ids: string[]) {
    for (let i = 1; i < ids.length; i++) connect(ids[i - 1]!, ids[i]!);
  }

  const start = add("startNode", { label: "Start" });

  /** Lays the graph out and hands it back. */
  function done(): ChatbotGraph {
    const layout = getLayoutedElements(
      nodes.map((node) => ({ id: node.id, position: node.position, data: {} })),
      edges,
    );
    const positions = new Map(layout.nodes.map((node) => [node.id, node.position]));
    return {
      nodes: nodes.map((node) => ({ ...node, position: positions.get(node.id) ?? node.position })),
      edges,
    };
  }

  return { add, connect, chain, start, done };
}

export type Graph = ReturnType<typeof createGraph>;

/** A fresh id for a button, list row, quick reply or card button. */
export function choiceId() {
  return crypto.randomUUID();
}

// ─── Node shorthands ──────────────────────────────────────────────────────────
// Message copy is English only, as the old templates were.

export function text(g: Graph, label: string, body: string) {
  return g.add("textNode", { label, body, previewUrl: false });
}

/** A question whose answer is kept under `variableName`. */
export function ask(g: Graph, label: string, question: string, variableName: string) {
  return g.add("textInputNode", { label, question, variableName });
}

/**
 * Hands the conversation to the team. The team is left for the user to pick: an example cannot
 * know it, and the node shows as unconfigured until they do.
 */
export function assign(g: Graph, label = "Hand off to the team") {
  return g.add("assignNode", {
    label,
    assign: {
      choice: "all",
      assignType: "staff",
      assignedUserIds: [],
      teamId: "",
      roundRobin: true,
      assignIfOnline: false,
    },
  });
}

/** WhatsApp reply buttons (up to 3). Returns the node and each button's id, in order. */
export function buttons(
  g: Graph,
  label: string,
  body: string,
  titles: string[],
  header?: string,
): { id: string; choices: string[] } {
  const choices = titles.map(() => choiceId());
  const id = g.add("buttonNode", {
    label,
    body,
    ...(header && { header, headerType: "text" }),
    buttons: titles.map((title, i) => ({ id: choices[i]!, title })),
  });
  return { id, choices };
}

/** A WhatsApp list with one section. Returns the node and each row's id, in order. */
export function list(
  g: Graph,
  label: string,
  body: string,
  button: string,
  section: string,
  rows: Array<{ title: string; description?: string }>,
  header?: string,
): { id: string; choices: string[] } {
  const choices = rows.map(() => choiceId());
  const id = g.add("listNode", {
    label,
    body,
    button,
    ...(header && { header }),
    sections: [{ title: section, rows: rows.map((row, i) => ({ id: choices[i]!, ...row })) }],
  });
  return { id, choices };
}

/** Instagram / Messenger quick replies. Returns the node and each reply's id, in order. */
export function quickReplies(
  g: Graph,
  label: string,
  message: string,
  titles: string[],
): { id: string; choices: string[] } {
  const choices = titles.map(() => choiceId());
  const id = g.add("instagramQuickReplyNode", {
    label,
    text: message,
    quick_replies: titles.map((title, i) => ({
      content_type: "text" as const,
      title,
      id: choices[i]!,
    })),
  });
  return { id, choices };
}

interface CardSpec {
  title: string;
  subtitle?: string;
  /** Link buttons leave the chat; reply buttons branch the conversation. */
  buttons: Array<{ title: string; url: string } | { title: string; reply: true }>;
}

/**
 * Instagram / Messenger cards. Returns the node and the id of each reply button, in the order
 * they appear across the cards (link buttons have none).
 */
export function cards(
  g: Graph,
  label: string,
  specs: CardSpec[],
): { id: string; choices: string[] } {
  const choices: string[] = [];
  const id = g.add("instagramGenericTemplateNode", {
    label,
    elements: specs.map((card) => ({
      title: card.title,
      ...(card.subtitle && { subtitle: card.subtitle }),
      buttons: card.buttons.map((button) => {
        if ("url" in button)
          return { type: "web_url" as const, title: button.title, url: button.url };
        const buttonId = choiceId();
        choices.push(buttonId);
        return { type: "postback" as const, title: button.title, id: buttonId };
      }),
    })),
  });
  return { id, choices };
}
