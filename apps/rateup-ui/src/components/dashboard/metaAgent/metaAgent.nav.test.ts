import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";

import { buildMetaAgentNavItems, buildMetaAgentNavProgress } from "./metaAgent.nav.ts";
import { getAgentStepStatus } from "./setup/agentSetup.ts";

const t = ((key: string) => key) as unknown as TFunction;

const status = getAgentStepStatus({
  eligible: true,
  onboarded: true,
  hasKnowledge: true,
  skillCount: 0,
  uiSkillCount: 0,
  connectorCount: 0,
  rolloutEnabled: false,
});

type Row = { title: string; url: string; done?: boolean };
const rows = (items: ReturnType<typeof buildMetaAgentNavItems>) =>
  items.flatMap((section) => (section.items ?? []) as Row[]);

describe("buildMetaAgentNavItems", () => {
  test("lists every step in flow order, grouped as on the setup guide", () => {
    const items = buildMetaAgentNavItems({ t, status });
    expect(items.map((section) => section.group)).toEqual([
      "Get started",
      "Teach your agent",
      "Go further",
      "Test and go live",
    ]);
    expect(rows(items).map((row) => row.url)).toEqual([
      "/dashboard/meta-agent/overview",
      "/dashboard/meta-agent/knowledge",
      "/dashboard/meta-agent/skills",
      "/dashboard/meta-agent/ui-skills",
      "/dashboard/meta-agent/connectors",
      "/dashboard/meta-agent/operate",
      "/dashboard/meta-agent/settings",
    ]);
  });

  test("ticks finished steps, and leaves testing without a marker", () => {
    const byUrl = Object.fromEntries(
      rows(buildMetaAgentNavItems({ t, status })).map((row) => [row.url, row.done]),
    );
    expect(byUrl["/dashboard/meta-agent/overview"]).toBe(true);
    expect(byUrl["/dashboard/meta-agent/knowledge"]).toBe(true);
    expect(byUrl["/dashboard/meta-agent/skills"]).toBe(false);
    expect(byUrl["/dashboard/meta-agent/operate"]).toBeUndefined();
  });

  test("draws no ticks while the status is unknown", () => {
    const done = rows(buildMetaAgentNavItems({ t, status: null })).map((row) => row.done);
    expect(done.every((value) => value === undefined)).toBe(true);
  });
});

describe("buildMetaAgentNavProgress", () => {
  test("counts the steps that can be finished", () => {
    expect(buildMetaAgentNavProgress({ t, status })).toEqual({
      label: "Agent setup",
      done: 2,
      total: 6,
    });
  });

  test("shows no meter while the status is unknown", () => {
    expect(buildMetaAgentNavProgress({ t, status: null })).toBeUndefined();
  });
});
