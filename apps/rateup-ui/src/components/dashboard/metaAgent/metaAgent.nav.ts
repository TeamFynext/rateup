// The Meta AI Agent's sub-nav, as entries for the shared app sidebar.
//
// Built like the setup guide's (`setup/setup.nav.ts`): data rather than markup,
// spliced into the "Meta AI Agent" entry by `useNavMain`, with a done tick on
// each step and an "x of y" meter at the foot of the panel. Every step is its
// own route, so the sidebar's path matching highlights the current one.

import type { TFunction } from "i18next";

import type { NavEntry, NavProgress } from "@/components/Layout/Navbar/hooks.tsx";

import {
  AGENT_STEP_META,
  AGENT_STEPS,
  type AgentStepGroup,
  type AgentStepStatus,
} from "./setup/agentSetup.ts";

export interface MetaAgentNavInput {
  /** Passed in rather than hooked: this builds data, so it is not a component. */
  t: TFunction;
  /**
   * Each step's finished state for the channel on screen, or `null` while it is
   * unknown — off the agent's pages, where nothing is fetched, or still loading.
   * Unknown draws no ticks and no meter rather than a misleading 0 of 6.
   */
  status: AgentStepStatus | null;
}

const GROUP_LABEL: Record<AgentStepGroup, string> = {
  connect: "Get started",
  teach: "Teach your agent",
  extend: "Go further",
  launch: "Test and go live",
};

/** Rows named for the sidebar; the overview is the guide the steps hang off. */
const NAV_LABEL: Record<(typeof AGENT_STEPS)[number], string> = {
  overview: "Setup guide",
  knowledge: "Knowledge",
  skills: "Skills",
  "ui-skills": "Rich replies",
  connectors: "Connectors",
  operate: "Test",
  settings: "Go live",
};

export function buildMetaAgentNavItems({ t, status }: MetaAgentNavInput): NavEntry[] {
  const rowsIn = (group: AgentStepGroup): NavEntry[] =>
    AGENT_STEPS.filter((step) => AGENT_STEP_META[step].group === group).map((step) => ({
      title: t(NAV_LABEL[step]),
      url: AGENT_STEP_META[step].to,
      icon: AGENT_STEP_META[step].icon,
      // Testing has no finished state (`null`), so it carries no marker at all.
      done: status && status[step] !== null ? status[step] === true : undefined,
    }));

  return (["connect", "teach", "extend", "launch"] as const).map((group) => ({
    group: t(GROUP_LABEL[group]),
    items: rowsIn(group),
  }));
}

/** The agent's "x of y" meter, for the foot of the section's panel. */
export function buildMetaAgentNavProgress({
  t,
  status,
}: MetaAgentNavInput): NavProgress | undefined {
  if (!status) return undefined;

  const counted = AGENT_STEPS.filter((step) => status[step] !== null);
  return {
    label: t("Agent setup"),
    done: counted.filter((step) => status[step] === true).length,
    total: counted.length,
  };
}
