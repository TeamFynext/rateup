import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";

import type { LoyaltyWaCommand } from "@/backend/loyalty/settings/settings.api";
import type { WaAutomatedReply, WaAutomationFlowJson } from "@/types/global";
import type { Rule } from "@/types/rule.ts";

import {
  findLoyaltyChatbot,
  findMenuRule,
  loyaltyChatbotPayload,
  loyaltyMenuGraph,
  loyaltyMenuPlan,
  loyaltyMenuRule,
  LOYALTY_MENU_NODE_ID,
  MENU_MAX_ROWS,
  MENU_ROW_TITLE_MAX,
  menuDrift,
  menuRowTitles,
  ruleTriggerWords,
  withMenuRows,
  type LoyaltyMenuEntry,
} from "./loyaltyChatbot";
import { loyaltyMessageCatalog } from "./loyaltyMessageCatalog";

const t = ((key: string) => key) as unknown as TFunction;
const catalog = loyaltyMessageCatalog(t);

const COPY = {
  header: "Bean There",
  body: "What would you like to do?",
  button: "Open menu",
  sectionTitle: "Your programme",
};

function command(type: string, requestMessage: string | null): LoyaltyWaCommand {
  return {
    id: `cmd-${type}`,
    orgId: "o",
    type,
    requestMessage,
    content: null,
    responseType: "Text",
    waTemplateId: null,
  };
}

function entries(...keywords: string[]): LoyaltyMenuEntry[] {
  return keywords.map((keyword) => ({ keyword, label: keyword, description: "" }));
}

describe("loyaltyMenuPlan", () => {
  test("uses the merchant's own keyword, with the catalog's words around it", () => {
    const { entries: rows } = loyaltyMenuPlan([command("PointInformation", "balance")], catalog);
    expect(rows).toEqual([
      {
        keyword: "balance",
        label: "Checking their balance",
        description: "Replies with what they have, spent and earned.",
      },
    ]);
  });

  test("orders rows the way the Replies tab lists them, custom keywords last", () => {
    const plan = loyaltyMenuPlan(
      [
        command("Referral", "refer"),
        command("SomethingCustom", "hours"),
        command("CustomerRegistration", "join"),
      ],
      catalog,
    );
    expect(plan.entries.map((entry) => entry.keyword)).toEqual(["join", "refer", "hours"]);
  });

  test("skips a command with no keyword, and the same keyword twice", () => {
    const plan = loyaltyMenuPlan(
      [
        command("PointInformation", "points"),
        command("Referral", null),
        command("Other", "  "),
        command("Duplicate", "POINTS"),
      ],
      catalog,
    );
    expect(plan.entries.map((entry) => entry.keyword)).toEqual(["points"]);
  });

  test("leaves out a keyword too long to be a row title, rather than truncating it", () => {
    // Truncating would break the title→keyword match the whole design rests on: the row
    // would be tapped and nothing would answer it.
    const long = "a".repeat(MENU_ROW_TITLE_MAX + 1);
    const plan = loyaltyMenuPlan([command("PointInformation", long)], catalog);
    expect(plan.entries).toEqual([]);
    expect(plan.excluded).toEqual([{ keyword: long, reason: "too_long" }]);
  });

  test("keeps a keyword exactly at the limit", () => {
    const exact = "a".repeat(MENU_ROW_TITLE_MAX);
    expect(loyaltyMenuPlan([command("PointInformation", exact)], catalog).entries).toHaveLength(1);
  });

  test("caps the menu at WhatsApp's row limit and says what fell off", () => {
    const many = Array.from({ length: MENU_MAX_ROWS + 2 }, (_, index) =>
      command(`Custom${index}`, `word${index}`),
    );
    const plan = loyaltyMenuPlan(many, catalog);
    expect(plan.entries).toHaveLength(MENU_MAX_ROWS);
    expect(plan.excluded.map((item) => item.reason)).toEqual(["over_limit", "over_limit"]);
  });
});

describe("loyaltyMenuGraph", () => {
  test("is a start node wired to the menu", () => {
    const graph = loyaltyMenuGraph(entries("points", "refer"), COPY);
    expect(graph.nodes.map((node) => node.type)).toEqual(["startNode", "listNode"]);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].source).toBe(graph.nodes[0].id);
    expect(graph.edges[0].target).toBe(LOYALTY_MENU_NODE_ID);
  });

  test("titles every row with the keyword verbatim", () => {
    // Case included: the loyalty lookup is case-insensitive, so the row shows the
    // merchant's own spelling rather than a normalised one.
    expect(menuRowTitles(loyaltyMenuGraph(entries("Points", "refer"), COPY))).toEqual([
      "Points",
      "refer",
    ]);
  });

  test("keeps the list button inside WhatsApp's 20 characters", () => {
    const graph = loyaltyMenuGraph(entries("points"), {
      ...COPY,
      button: "Open the loyalty programme menu",
    });
    const button = graph.nodes[1].data.button as string;
    expect(button.length).toBeLessThanOrEqual(20);
  });
});

describe("loyaltyChatbotPayload", () => {
  test("is a WhatsApp flow automation on the chosen account", () => {
    const graph = loyaltyMenuGraph(entries("points"), COPY);
    expect(
      loyaltyChatbotPayload({ name: "Loyalty menu", graph, whatsappSettingsPhoneId: "phone-1" }),
    ).toMatchObject({
      name: "Loyalty menu",
      platform: "whatsapp",
      whatsappSettingsPhoneId: "phone-1",
      matchData: { caseSensitive: false },
    });
  });
});

describe("loyaltyMenuRule", () => {
  test("fires on the whole message, not a word inside one", () => {
    const rule = loyaltyMenuRule({
      name: "Loyalty menu",
      chatbotId: "bot-1",
      triggerWord: " menu ",
      whatsappSettingsPhoneIds: ["phone-1"],
    });
    expect(rule.triggerEvent).toBe("MESSAGE_RECEIVED");
    expect(rule.groups[0].conditions[0]).toEqual({
      field: "MESSAGE_BODY",
      operator: "EQUALS",
      value: "menu",
    });
    expect(rule.actions).toEqual([{ type: "TRIGGER_CHATBOT", value: "bot-1" }]);
    expect(rule.isActive).toBe(true);
  });
});

describe("findLoyaltyChatbot", () => {
  function automation(id: string, graph: WaAutomationFlowJson | undefined): WaAutomatedReply {
    return { id, name: id, matchData: { caseSensitive: false, json: graph } } as WaAutomatedReply;
  }

  test("recognises the generated bot by its menu node, whatever it was renamed to", () => {
    const mine = automation("bot-2", loyaltyMenuGraph(entries("points"), COPY));
    const others = [
      automation("bot-0", undefined),
      automation("bot-1", { nodes: [{ id: "x", position: { x: 0, y: 0 }, data: {} }], edges: [] }),
    ];
    expect(findLoyaltyChatbot([...others, mine])?.id).toBe("bot-2");
    expect(findLoyaltyChatbot(others)).toBeUndefined();
  });
});

describe("menuDrift", () => {
  test("reports keywords the menu misses and rows nothing answers", () => {
    const graph = loyaltyMenuGraph(entries("points", "stop"), COPY);
    const drift = menuDrift(graph, entries("points", "refer"));
    expect(drift.missing.map((entry) => entry.keyword)).toEqual(["refer"]);
    expect(drift.stale).toEqual(["stop"]);
  });

  test("matches rows to keywords regardless of case", () => {
    const graph = loyaltyMenuGraph(entries("Points"), COPY);
    expect(menuDrift(graph, entries("points"))).toEqual({ missing: [], stale: [] });
  });
});

describe("withMenuRows", () => {
  test("rewrites the rows and nothing else the merchant may have changed", () => {
    const graph = loyaltyMenuGraph(entries("points"), COPY);
    // Stand in for edits made in the flow editor.
    graph.nodes[1].position = { x: 999, y: 42 };
    graph.nodes[1].data.header = "Our own words";
    graph.nodes.push({ id: "extra", type: "textNode", position: { x: 0, y: 0 }, data: {} });

    const next = withMenuRows(graph, entries("points", "refer"), "ignored");

    expect(menuRowTitles(next)).toEqual(["points", "refer"]);
    expect(next.nodes[1].position).toEqual({ x: 999, y: 42 });
    expect(next.nodes[1].data.header).toBe("Our own words");
    expect(next.nodes.map((node) => node.id)).toContain("extra");
    // The section keeps the title it was saved with rather than taking the new one.
    const sections = next.nodes[1].data.sections as Array<{ title: string }>;
    expect(sections[0].title).toBe(COPY.sectionTitle);
  });
});

describe("findMenuRule / ruleTriggerWords", () => {
  function rule(id: string, chatbotId: string, values: string[]): Rule {
    return {
      id,
      actions: [{ type: "TRIGGER_CHATBOT", value: chatbotId }],
      groups: [
        {
          operator: "AND",
          conditions: values.map((value) => ({
            field: "MESSAGE_BODY",
            operator: "EQUALS",
            value,
          })),
        },
      ],
    } as unknown as Rule;
  }

  test("finds the rule pointing at this chatbot, and reads its words", () => {
    const rules = [rule("r0", "other-bot", ["hi"]), rule("r1", "bot-1", ["menu", "help"])];
    const found = findMenuRule(rules, "bot-1");
    expect(found?.id).toBe("r1");
    expect(ruleTriggerWords(found)).toEqual(["menu", "help"]);
  });

  test("is undefined when nothing triggers the bot, or there is no bot yet", () => {
    expect(findMenuRule([rule("r0", "other-bot", ["hi"])], "bot-1")).toBeUndefined();
    expect(findMenuRule([rule("r0", "bot-1", ["hi"])], undefined)).toBeUndefined();
    expect(ruleTriggerWords(undefined)).toEqual([]);
  });
});
