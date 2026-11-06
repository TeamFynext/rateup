import {
  IconBook,
  IconChartBar,
  IconLayoutGrid,
  IconPlayerPlay,
  IconPlug,
  IconPlugConnected,
  IconRocket,
  IconSparkles,
  type TablerIcon,
} from "@tabler/icons-react";

import type { RowTint } from "@/components/common/setup-row-card.tsx";

import type { StepTone } from "../../loyalty/onboarding/wizardSteps.ts";

/**
 * The agent's setup path, in the order a merchant should walk it. Every step is
 * its own route (the sidebar links straight to each), so this is the one table
 * that says what a route is called as a step, how long it takes and where it
 * sits in the guide.
 */
export const AGENT_STEPS = [
  "overview",
  "knowledge",
  "skills",
  "ui-skills",
  "connectors",
  "operate",
  "settings",
  "insights",
] as const;

export type AgentStep = (typeof AGENT_STEPS)[number];

/**
 * A step's URL slug. The keys above are code names; four steps were renamed in
 * the URL to match their sidebar labels, so the slug is not always the key.
 */
type AgentStepSlug =
  | Exclude<AgentStep, "overview" | "ui-skills" | "operate" | "settings">
  | "setup-guide"
  | "rich-replies"
  | "test"
  | "go-live";

/** Where a step sits on the setup guide. */
export type AgentStepGroup = "connect" | "teach" | "extend" | "launch";

export interface AgentStepMeta {
  /** The step's name on the rail and the guide. */
  label: string;
  /** The lead-in under the step's heading. */
  description: string;
  icon: TablerIcon;
  tone: StepTone;
  tint: RowTint;
  minutes: number;
  group: AgentStepGroup;
  to: `/dashboard/meta-agent/${AgentStepSlug}`;
}

export const AGENT_STEP_META: Record<AgentStep, AgentStepMeta> = {
  overview: {
    label: "Connect",
    description: "Check the number with Meta and create the agent.",
    icon: IconPlugConnected,
    tone: "green",
    tint: "green",
    minutes: 2,
    group: "connect",
    to: "/dashboard/meta-agent/setup-guide",
  },
  knowledge: {
    label: "Knowledge",
    description:
      "What the agent answers from: your business details, FAQs, documents and website pages.",
    icon: IconBook,
    tone: "blue",
    tint: "accent",
    minutes: 5,
    group: "teach",
    to: "/dashboard/meta-agent/knowledge",
  },
  skills: {
    label: "Skills",
    description:
      "Plain-language instructions for things the agent can do, like taking a booking or checking an order.",
    icon: IconSparkles,
    tone: "blue",
    tint: "accent",
    minutes: 3,
    group: "teach",
    to: "/dashboard/meta-agent/skills",
  },
  "ui-skills": {
    label: "Rich replies",
    description: "WhatsApp carousels, buttons and flows the agent can send instead of plain text.",
    icon: IconLayoutGrid,
    tone: "amber",
    tint: "warm",
    minutes: 3,
    group: "extend",
    to: "/dashboard/meta-agent/rich-replies",
  },
  connectors: {
    label: "Connectors",
    description:
      "Connect your own APIs so the agent can look up live data, such as order status or stock.",
    icon: IconPlug,
    tone: "amber",
    tint: "warm",
    minutes: 5,
    group: "extend",
    to: "/dashboard/meta-agent/connectors",
  },
  operate: {
    label: "Test",
    description: "Chat with the agent before customers do, run evaluations and take over threads.",
    icon: IconPlayerPlay,
    tone: "blue",
    tint: "accent",
    minutes: 2,
    group: "launch",
    to: "/dashboard/meta-agent/test",
  },
  settings: {
    label: "Go live",
    description:
      "Choose who the agent answers and how it hands over to your team, then turn it on.",
    icon: IconRocket,
    tone: "green",
    tint: "brand",
    minutes: 1,
    group: "launch",
    to: "/dashboard/meta-agent/go-live",
  },
  insights: {
    label: "Insights",
    description:
      "How the agent is doing once it is live: conversations handled, handoffs waiting, and how your tools and events perform.",
    icon: IconChartBar,
    tone: "blue",
    tint: "accent",
    minutes: 1,
    group: "launch",
    to: "/dashboard/meta-agent/insights",
  },
};

/** What the guide knows about the agent, read from the queries every section already makes. */
export interface AgentSetupInput {
  eligible: boolean;
  onboarded: boolean;
  hasKnowledge: boolean;
  skillCount: number;
  uiSkillCount: number;
  connectorCount: number;
  rolloutEnabled: boolean;
}

/**
 * Whether each step is finished. `null` means the step has no finished state:
 * testing is something you come back to, not something you tick off, so it is
 * left out of the count rather than shown as permanently outstanding.
 */
export type AgentStepStatus = Record<AgentStep, boolean | null>;

export function getAgentStepStatus(input: AgentSetupInput): AgentStepStatus {
  return {
    overview: input.onboarded,
    knowledge: input.hasKnowledge,
    skills: input.skillCount > 0,
    "ui-skills": input.uiSkillCount > 0,
    connectors: input.connectorCount > 0,
    operate: null,
    settings: input.onboarded && input.rolloutEnabled,
    // Something to come back to once live, not a step to finish.
    insights: null,
  };
}

export interface AgentSetupProgress {
  status: AgentStepStatus;
  /** The facts the statuses were read from, for the guide's detail lines. */
  facts: AgentSetupInput;
  done: number;
  total: number;
  minsLeft: number;
  pct: number;
  /** Onboarded and switched on: the agent is answering customers. */
  live: boolean;
}

export function getAgentSetupProgress(input: AgentSetupInput): AgentSetupProgress {
  const status = getAgentStepStatus(input);
  const counted = AGENT_STEPS.filter((step) => status[step] !== null);
  const done = counted.filter((step) => status[step]).length;
  const minsLeft = counted
    .filter((step) => !status[step])
    .reduce((sum, step) => sum + AGENT_STEP_META[step].minutes, 0);

  return {
    status,
    facts: input,
    done,
    total: counted.length,
    minsLeft,
    pct: Math.round((done / counted.length) * 100),
    live: status.settings === true,
  };
}
