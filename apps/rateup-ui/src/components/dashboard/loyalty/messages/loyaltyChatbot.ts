import type { LoyaltyWaCommand } from "@/backend/loyalty/settings/settings.api";
import type { WaAutomatedReply, WaAutomationFlowJson, WaAutomationFlowNode } from "@/types/global";
import type { CreateRule, Rule } from "@/types/rule.ts";

import type { LoyaltyMessageDefinition } from "./loyaltyMessageCatalog.ts";

/**
 * The loyalty keyword menu, as a WhatsApp chatbot.
 *
 * The programme already answers keywords — POINTS, REWARDS, REFER — but only for a
 * customer who knows to type them. This builds a flowbot that shows them as a tappable
 * list instead, and the answering stays exactly where it is: tapping a row makes WhatsApp
 * send the row's **title** as the customer's next message (`parseMessage` on the API reads
 * `interactive[type].title`), and the inbound handler looks a `LoyaltyWaCommand` up from
 * that text before any automation runs. So a row titled `points` produces the real
 * PointInformation reply, with the live balance in it.
 *
 * Two things follow from that, and both are load-bearing here:
 *
 *  - **A row title has to be the keyword, exactly.** Truncating one to fit WhatsApp's
 *    24-character limit would break the match and answer nothing, so an over-long keyword
 *    is left out of the menu and reported instead.
 *  - **The keywords cannot trigger the bot itself.** The loyalty handler claims them first,
 *    and the API refuses a loyalty keyword already used by an automation. The menu is
 *    reached by its own word through a rule — see `loyaltyMenuRule`.
 */

/** The menu node's id. Fixed, because it is also how a generated bot is recognised later. */
export const LOYALTY_MENU_NODE_ID = "loyalty-keyword-menu";
const LOYALTY_MENU_START_ID = "loyalty-menu-start";

/** WhatsApp's interactive-list limits. */
export const MENU_ROW_TITLE_MAX = 24;
const MENU_ROW_DESCRIPTION_MAX = 72;
export const MENU_MAX_ROWS = 10;

const EDGE_COLOR = "#6366f1";

export interface LoyaltyMenuEntry {
  /** The keyword itself. The row title is this, unchanged — see the note above. */
  keyword: string;
  /** "Checking their balance", from the catalog; the keyword itself for a custom one. */
  label: string;
  description: string;
}

export type MenuExclusionReason = "too_long" | "over_limit";

export interface LoyaltyMenuPlan {
  entries: LoyaltyMenuEntry[];
  /** Keywords the menu cannot carry, so the tab can say which and why. */
  excluded: Array<{ keyword: string; reason: MenuExclusionReason }>;
}

/** A TipTap document, the shape the flow editor's rich-text fields round-trip. */
function richText(text: string) {
  return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

function clamp(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

/**
 * The rows a menu would carry right now, from the keywords the merchant has defined.
 * Ordered as the catalog orders them, so the menu reads the way the Replies tab does,
 * with anything the merchant added beyond it last.
 */
export function loyaltyMenuPlan(
  commands: readonly LoyaltyWaCommand[],
  catalog: readonly LoyaltyMessageDefinition[],
): LoyaltyMenuPlan {
  const order = new Map(
    catalog.filter((entry) => entry.kind === "keyword").map((entry, index) => [entry.type, index]),
  );
  const byType = new Map(
    catalog.map((entry) => [entry.kind === "keyword" ? entry.type : "", entry]),
  );

  const seen = new Set<string>();
  const candidates: Array<{ entry: LoyaltyMenuEntry; rank: number }> = [];
  for (const command of commands) {
    const keyword = command.requestMessage?.trim();
    if (!keyword) continue;
    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const definition = byType.get(command.type);
    candidates.push({
      entry: {
        keyword,
        label: definition?.label ?? keyword,
        description: clamp(definition?.description ?? "", MENU_ROW_DESCRIPTION_MAX),
      },
      rank: order.get(command.type) ?? order.size,
    });
  }
  candidates.sort((a, b) => a.rank - b.rank);

  const entries: LoyaltyMenuEntry[] = [];
  const excluded: LoyaltyMenuPlan["excluded"] = [];
  for (const { entry } of candidates) {
    if (entry.keyword.length > MENU_ROW_TITLE_MAX) {
      excluded.push({ keyword: entry.keyword, reason: "too_long" });
    } else if (entries.length >= MENU_MAX_ROWS) {
      excluded.push({ keyword: entry.keyword, reason: "over_limit" });
    } else {
      entries.push(entry);
    }
  }
  return { entries, excluded };
}

/** The list node's `sections`, the one part of the graph an update rewrites. */
function menuSections(entries: readonly LoyaltyMenuEntry[], sectionTitle: string) {
  return [
    {
      title: clamp(sectionTitle, MENU_ROW_TITLE_MAX),
      rows: entries.map((entry) => ({
        // The id is only read when nothing answers the title; keeping the keyword in it
        // makes an unanswered tap readable in the automation log.
        id: `loyalty-${entry.keyword.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`,
        title: entry.keyword,
        description: entry.description,
      })),
    },
  ];
}

export interface MenuCopy {
  /** Shown above the list, e.g. the programme's name. */
  header: string;
  body: string;
  button: string;
  sectionTitle: string;
}

/** A start node wired to one list node — the whole bot, because the replies already exist. */
export function loyaltyMenuGraph(
  entries: readonly LoyaltyMenuEntry[],
  copy: MenuCopy,
): WaAutomationFlowJson {
  return {
    nodes: [
      {
        id: LOYALTY_MENU_START_ID,
        type: "startNode",
        position: { x: 100, y: 200 },
        data: { type: "startNode", label: "Start", startMessage: "" },
      },
      {
        id: LOYALTY_MENU_NODE_ID,
        type: "listNode",
        position: { x: 400, y: 160 },
        data: {
          type: "listNode",
          label: "Loyalty menu",
          header: clamp(copy.header, 60),
          body: richText(copy.body),
          button: clamp(copy.button, 20),
          sections: menuSections(entries, copy.sectionTitle),
          platform: "whatsapp",
        },
      },
    ],
    edges: [
      {
        id: "loyalty-menu-edge",
        type: "custom",
        source: LOYALTY_MENU_START_ID,
        target: LOYALTY_MENU_NODE_ID,
        sourceHandle: "right",
        targetHandle: "left",
        style: { stroke: EDGE_COLOR, strokeWidth: 2 },
        markerEnd: { type: "arrowclosed", color: EDGE_COLOR },
      },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

/** The create body for `POST /whatsapp/automated-reply`. */
export function loyaltyChatbotPayload(input: {
  name: string;
  graph: WaAutomationFlowJson;
  whatsappSettingsPhoneId: string | null;
}) {
  return {
    name: input.name,
    platform: "whatsapp",
    matchData: { json: input.graph, caseSensitive: false },
    whatsappSettingsPhoneId: input.whatsappSettingsPhoneId,
  };
}

/**
 * The rule that opens the menu. `EQUALS` rather than `CONTAINS`: the trigger word is a
 * whole message the customer sends, and a contains-rule on "menu" would fire on any
 * sentence with the word in it.
 */
export function loyaltyMenuRule(input: {
  name: string;
  chatbotId: string;
  triggerWord: string;
  whatsappSettingsPhoneIds: string[];
}): CreateRule {
  return {
    platform: "WHATSAPP",
    whatsappSettingsPhoneIds: input.whatsappSettingsPhoneIds,
    name: input.name,
    operator: "AND",
    isActive: true,
    triggerEvent: "MESSAGE_RECEIVED",
    groups: [
      {
        operator: "AND",
        conditions: [
          { field: "MESSAGE_BODY", operator: "EQUALS", value: input.triggerWord.trim() },
        ],
      },
    ],
    actions: [{ type: "TRIGGER_CHATBOT", value: input.chatbotId }],
    options: {
      sendOncePerDay: false,
      shopifyEvent: undefined,
      businessHours: { enabled: false, businessHoursId: undefined },
      shopifyProductIds: [],
      instagramScope: "ALL",
      instagramPostIds: [],
    },
  };
}

function menuNodeOf(graph: WaAutomationFlowJson | undefined): WaAutomationFlowNode | undefined {
  return graph?.nodes?.find((node) => node.id === LOYALTY_MENU_NODE_ID);
}

/** The generated bot among the org's chatbots, recognised by its menu node. */
export function findLoyaltyChatbot(
  automations: readonly WaAutomatedReply[],
): WaAutomatedReply | undefined {
  return automations.find((automation) => menuNodeOf(automation.matchData?.json));
}

interface MenuRow {
  id?: string;
  title?: string;
  description?: string;
}

interface MenuSection {
  title?: string;
  rows?: MenuRow[];
}

/** The row titles a saved menu carries, in order. */
export function menuRowTitles(graph: WaAutomationFlowJson | undefined): string[] {
  const sections = menuNodeOf(graph)?.data?.sections;
  if (!Array.isArray(sections)) return [];
  return (sections as MenuSection[]).flatMap((section) =>
    (section.rows ?? []).map((row) => row.title ?? "").filter(Boolean),
  );
}

export interface MenuDrift {
  /** Keywords the programme answers that the saved menu does not offer. */
  missing: LoyaltyMenuEntry[];
  /** Rows the menu still offers that no keyword answers any more. */
  stale: string[];
}

export function menuDrift(
  graph: WaAutomationFlowJson | undefined,
  entries: readonly LoyaltyMenuEntry[],
): MenuDrift {
  const rows = menuRowTitles(graph);
  const inMenu = new Set(rows.map((title) => title.toLowerCase()));
  const answered = new Set(entries.map((entry) => entry.keyword.toLowerCase()));
  return {
    missing: entries.filter((entry) => !inMenu.has(entry.keyword.toLowerCase())),
    stale: rows.filter((title) => !answered.has(title.toLowerCase())),
  };
}

/**
 * The saved graph with only the menu's rows rewritten. Everything else the merchant may
 * have changed in the flow editor — the wording, the node's position, anything they wired
 * after it — is left exactly as it is.
 */
export function withMenuRows(
  graph: WaAutomationFlowJson,
  entries: readonly LoyaltyMenuEntry[],
  sectionTitle: string,
): WaAutomationFlowJson {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (node.id !== LOYALTY_MENU_NODE_ID) return node;
      const current = Array.isArray(node.data?.sections)
        ? (node.data.sections as MenuSection[])[0]
        : undefined;
      return {
        ...node,
        data: { ...node.data, sections: menuSections(entries, current?.title ?? sectionTitle) },
      };
    }),
  };
}

/** The rule that triggers a given chatbot, if one exists. */
export function findMenuRule(
  rules: readonly Rule[],
  chatbotId: string | undefined,
): Rule | undefined {
  if (!chatbotId) return undefined;
  return rules.find((rule) =>
    rule.actions?.some((action) => action.type === "TRIGGER_CHATBOT" && action.value === chatbotId),
  );
}

/** The words a rule fires on, for the "texting X opens the menu" line. */
export function ruleTriggerWords(rule: Rule | undefined): string[] {
  if (!rule) return [];
  return (rule.groups ?? [])
    .flatMap((group) => group.conditions ?? [])
    .filter((condition) => condition.field === "MESSAGE_BODY")
    .map((condition) => condition.value)
    .filter(Boolean);
}
