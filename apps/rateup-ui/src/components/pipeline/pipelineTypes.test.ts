import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";

import type { PipelineType } from "@/backend/pipeline/pipeline.types.ts";

import { findLeadsPipeline, PIPELINE_TYPE_ORDER, pipelineTypeConfig } from "./pipelineTypes.ts";

// Echoes the key with its values filled, which is all these assertions need.
const t = ((key: string, values?: Record<string, unknown>) =>
  key.replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? ""))) as TFunction;

describe("pipeline types", () => {
  test("only the Leads board carries the sales funnel", () => {
    for (const type of PIPELINE_TYPE_ORDER) {
      const { features } = pipelineTypeConfig(t, type);
      const expected = type === "LEADS";
      expect(Object.values(features).every((on) => on === expected)).toBe(true);
    }
  });

  test("each type names its own cards and closed columns", () => {
    const support = pipelineTypeConfig(t, "SUPPORT");
    expect(support.addCard).toBe("Add ticket");
    expect([support.wonLabel, support.lostLabel]).toEqual(["Resolved", "Closed"]);
    expect(pipelineTypeConfig(t, "LEADS").counts(2, 5)).toBe("2 open · 5 leads");
  });

  test("the Leads board is found by type, not by position", () => {
    const boards: Array<{ id: string; type: PipelineType }> = [
      { id: "support", type: "SUPPORT" },
      { id: "leads", type: "LEADS" },
    ];
    expect(findLeadsPipeline(boards)?.id).toBe("leads");
    expect(findLeadsPipeline([{ id: "p", type: "PROJECTS" }])).toBeUndefined();
  });
});
