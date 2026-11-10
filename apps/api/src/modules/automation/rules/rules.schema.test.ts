import { describe, expect, test } from "vite-plus/test";

import { matchDataSchema } from "./rules.schema.js";

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

describe("matchDataSchema", () => {
  test("keeps the editor's graph as saved, React Flow fields included", () => {
    const parsed = matchDataSchema.parse({ json: graph, caseSensitive: false });
    expect(parsed.json?.nodes[0]).toMatchObject({ measured: { width: 200 } });
    expect(parsed.json?.edges[0]).toMatchObject({ markerEnd: { type: "arrowclosed" } });
  });

  test("drops keys the app never reads", () => {
    const parsed = matchDataSchema.parse({ caseSensitive: true, keywords: ["hi"], evil: { a: 1 } });
    expect(parsed).toEqual({ caseSensitive: true, keywords: ["hi"] });
  });

  test.each([
    ["a graph that is not a graph", { json: "<script>" }],
    ["an edge without a target", { json: { nodes: [], edges: [{ source: "a" }] } }],
  ])("refuses %s", (_label, body) => {
    expect(matchDataSchema.safeParse(body).success).toBe(false);
  });
});
