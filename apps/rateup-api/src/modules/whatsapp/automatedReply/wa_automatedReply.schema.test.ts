import { describe, expect, test } from "vitest";

import {
  createAutomatedReplySchema,
  initiateAutomatedReplyBody,
  updateAutomatedReplySchema,
} from "./wa_automatedReply.schema.js";

// What React Flow's toObject() gives the flow editor, extra fields and all.
const graph = {
  nodes: [
    {
      id: "start",
      type: "startNode",
      position: { x: 0, y: 0 },
      data: { label: "Start" },
      measured: { width: 200, height: 80 },
      selected: false,
    },
    { id: "menu", type: "listNode", position: { x: 300, y: 0 }, data: { body: "Pick one" } },
  ],
  edges: [
    {
      id: "e1",
      source: "start",
      target: "menu",
      sourceHandle: "right",
      targetHandle: null,
      style: { stroke: "#999", strokeWidth: 2 },
      markerEnd: { type: "arrowclosed", color: "#999" },
    },
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
};

describe("createAutomatedReplySchema", () => {
  test("accepts the loyalty chatbot and chatbot wizard bodies (null number included)", () => {
    const body = {
      name: "Loyalty menu",
      platform: "whatsapp",
      matchData: { json: graph, caseSensitive: false },
      whatsappSettingsPhoneId: null,
    };
    const parsed = createAutomatedReplySchema.parse(body);
    expect(parsed.matchData.json?.nodes[0]).toMatchObject({ measured: { width: 200 } });
    expect(parsed.matchData.json?.edges[0]).toMatchObject({ markerEnd: { type: "arrowclosed" } });
  });

  test("drops matchData keys the app never reads", () => {
    const parsed = createAutomatedReplySchema.parse({
      name: "x",
      matchData: { caseSensitive: true, keywords: ["hi"], evil: { a: 1 } },
    });
    expect(parsed.matchData).toEqual({ caseSensitive: true, keywords: ["hi"] });
  });

  test.each([
    ["a blank name", { name: " ", matchData: {} }],
    ["a missing matchData", { name: "x" }],
    ["a graph that is not a graph", { name: "x", matchData: { json: "<script>" } }],
    [
      "an edge without a target",
      { name: "x", matchData: { json: { nodes: [], edges: [{ source: "a" }] } } },
    ],
    ["an oversized name", { name: "n".repeat(201), matchData: {} }],
  ])("refuses %s", (_label, body) => {
    expect(createAutomatedReplySchema.safeParse(body).success).toBe(false);
  });
});

describe("updateAutomatedReplySchema", () => {
  test("accepts the flow editor's resend of the whole loaded row", () => {
    const parsed = updateAutomatedReplySchema.parse({
      id: "a1",
      orgId: "org-1",
      createdAt: "2026-10-20T00:00:00.000Z",
      name: "Flow",
      platform: "whatsapp",
      whatsappSettingsPhoneId: null,
      commands: [],
      matchData: { caseSensitive: false, json: graph },
    });
    expect(parsed).not.toHaveProperty("orgId");
    expect(parsed).not.toHaveProperty("id");
    expect(parsed.matchData?.json?.nodes).toHaveLength(2);
  });

  test("accepts a rename on its own", () => {
    expect(updateAutomatedReplySchema.parse({ name: "Renamed" })).toEqual({ name: "Renamed" });
  });
});

test("initiate needs a phone", () => {
  expect(initiateAutomatedReplyBody.safeParse({}).success).toBe(false);
  expect(initiateAutomatedReplyBody.parse({ phone: "919999999999" })).toEqual({
    phone: "919999999999",
  });
});
