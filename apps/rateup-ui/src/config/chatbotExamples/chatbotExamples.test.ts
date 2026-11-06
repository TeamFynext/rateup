import { describe, expect, test } from "vite-plus/test";

import type { TypedNode } from "@/components/whatsapp/automation/types/node-types.ts";
import { validateNodeData } from "@/components/whatsapp/automation/types/node-types.ts";
import { getNodeLimitErrors } from "@/components/whatsapp/automation/types/node-validation.ts";
import { AutomationPlatform, isComponentSupportedOnPlatform } from "@/types/platform.ts";

import {
  CHATBOT_EXAMPLES,
  CHATBOT_TRIGGERS,
  CHATBOT_USE_CASES,
  examplesFor,
  findTrigger,
} from "./index.ts";

/** The handles a node's branches may leave from: its choices, or "right" for "then". */
function handlesOf(node: TypedNode): string[] {
  const data = node.data as {
    buttons?: Array<{ id: string }>;
    sections?: Array<{ rows: Array<{ id: string }> }>;
    quick_replies?: Array<{ id?: string }>;
    elements?: Array<{ buttons?: Array<{ id?: string; type: string }> }>;
  };
  switch (node.type) {
    case "buttonNode":
      return (data.buttons ?? []).map((button) => button.id);
    case "listNode":
      return (data.sections ?? []).flatMap((section) => section.rows.map((row) => row.id));
    case "instagramQuickReplyNode":
      return (data.quick_replies ?? []).flatMap((reply) => (reply.id ? [reply.id] : []));
    case "instagramGenericTemplateNode":
      return (data.elements ?? []).flatMap((card) =>
        (card.buttons ?? []).flatMap((button) =>
          button.type === "postback" && button.id ? [button.id] : [],
        ),
      );
    case "instagramFollowCheckNode":
      return ["following", "notFollowing"];
    default:
      return ["right"];
  }
}

describe.each(CHATBOT_EXAMPLES.map((example) => [example.key, example] as const))(
  "%s",
  (_key, example) => {
    const graph = example.build();
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));

    test("uses only nodes its channel supports", () => {
      const unsupported = graph.nodes
        .filter((node) => !isComponentSupportedOnPlatform(node.type, example.platform))
        .map((node) => node.type);
      expect(unsupported).toEqual([]);
    });

    test("has exactly one start node", () => {
      expect(graph.nodes.filter((node) => node.type === "startNode")).toHaveLength(1);
    });

    test("every edge joins two nodes, from a handle its source has", () => {
      for (const edge of graph.edges) {
        const source = byId.get(edge.source);
        expect(source, `edge ${edge.id} source`).toBeDefined();
        expect(byId.has(edge.target), `edge ${edge.id} target`).toBe(true);
        expect(handlesOf(source!)).toContain(edge.sourceHandle);
      }
    });

    test("every node can be reached from the start", () => {
      const start = graph.nodes.find((node) => node.type === "startNode")!;
      const seen = new Set([start.id]);
      const queue = [start.id];
      while (queue.length) {
        const id = queue.shift()!;
        for (const edge of graph.edges) {
          if (edge.source === id && !seen.has(edge.target)) {
            seen.add(edge.target);
            queue.push(edge.target);
          }
        }
      }
      expect(graph.nodes.filter((node) => !seen.has(node.id)).map((n) => n.data.label)).toEqual([]);
    });

    test("passes the editor's own validation", () => {
      const problems = graph.nodes
        .map((node) => validateNodeData(node))
        .filter((result) => !result.valid)
        .map((result) => result.message);
      expect(problems).toEqual([]);
    });

    test("fits its channel's limits", () => {
      const problems = graph.nodes
        .map((node) => getNodeLimitErrors(node, example.platform))
        .filter((errors) => Object.keys(errors).length > 0);
      expect(problems).toEqual([]);
    });

    // The limits the node editors enforce, and Meta's own.
    test("stays within the quick reply and card limits", () => {
      for (const node of graph.nodes) {
        if (node.type === "instagramQuickReplyNode") {
          const replies = (node.data as { quick_replies: Array<{ title: string }> }).quick_replies;
          expect(replies.length).toBeLessThanOrEqual(13);
          for (const reply of replies) expect(reply.title.length).toBeLessThanOrEqual(20);
        }
        if (node.type === "instagramGenericTemplateNode") {
          const elements = (
            node.data as { elements: Array<{ title: string; buttons?: Array<{ title: string }> }> }
          ).elements;
          expect(elements.length).toBeLessThanOrEqual(10);
          for (const card of elements) {
            expect(card.title.length).toBeLessThanOrEqual(80);
            for (const button of card.buttons ?? []) {
              expect(button.title.length).toBeLessThanOrEqual(20);
            }
          }
        }
      }
    });

    test("lays the graph out rather than stacking it at the origin", () => {
      const positions = new Set(graph.nodes.map((node) => `${node.position.x},${node.position.y}`));
      expect(positions.size).toBe(graph.nodes.length);
    });

    // The engines match a tapped choice on its id, so two chatbots from one example must not
    // share any.
    test("builds fresh ids every time", () => {
      const ids = (g: typeof graph) =>
        [
          ...g.nodes.map((node) => node.id),
          ...g.edges.map((edge) => edge.id),
          ...g.edges.map((edge) => edge.sourceHandle),
        ].filter((id) => id && !["right", "following", "notFollowing"].includes(id));
      const again = new Set(ids(example.build()));
      expect(ids(graph).filter((id) => again.has(id))).toEqual([]);
    });
  },
);

describe("the catalogue", () => {
  test("keys are unique", () => {
    const keys = CHATBOT_EXAMPLES.map((example) => example.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("every example's use case has a chip", () => {
    const useCases = new Set(CHATBOT_USE_CASES.map((useCase) => useCase.value));
    for (const example of CHATBOT_EXAMPLES) expect(useCases.has(example.useCase)).toBe(true);
  });

  test("every example starts in a way its channel offers", () => {
    for (const example of CHATBOT_EXAMPLES) {
      expect(findTrigger(example.platform, example.trigger), example.key).toBeDefined();
    }
  });

  test("every start but a lead ad names its rule trigger", () => {
    for (const options of Object.values(CHATBOT_TRIGGERS)) {
      for (const option of options) {
        if (option.kind !== "leadad") expect(option.triggerEvent, option.kind).toBeTruthy();
      }
    }
  });

  test("every channel has examples", () => {
    for (const platform of Object.values(AutomationPlatform)) {
      expect(examplesFor(platform).length).toBeGreaterThan(0);
    }
  });
});
