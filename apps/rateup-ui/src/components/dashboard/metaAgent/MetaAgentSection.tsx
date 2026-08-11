import { ConnectorsSection } from "./components/ConnectorsSection";
import { KnowledgeSection } from "./components/KnowledgeSection";
import { OperateSection } from "./components/OperateSection";
import { OverviewSection } from "./components/OverviewSection";
import { SettingsSection } from "./components/SettingsSection";
import { SkillsSection } from "./components/SkillsSection";
import { UiSkillsSection } from "./components/UiSkillsSection";
import { useMetaAgentContext } from "./MetaAgentContext";

/**
 * The Meta Business Agent is one page per area, each its own route so the main
 * sidebar can link straight to it. This table is the single place a section's
 * heading, blurb and component live; the route files are one line each.
 */
export const META_AGENT_SECTIONS = {
  overview: {
    title: "Overview",
    description: "Eligibility, onboarding and who the agent is allowed to answer.",
    Component: OverviewSection,
  },
  knowledge: {
    title: "Knowledge",
    description: "Business info, FAQs, files and websites the agent draws answers from.",
    Component: KnowledgeSection,
  },
  skills: {
    title: "Skills",
    description: "Written instructions for capabilities the agent may perform.",
    Component: SkillsSection,
  },
  "ui-skills": {
    title: "UI skills",
    description: "Rich WhatsApp components — carousels, CTAs, flows — the agent may send.",
    Component: UiSkillsSection,
  },
  connectors: {
    title: "Connectors",
    description: "External APIs and the tools on them the agent can call for live data.",
    Component: ConnectorsSection,
  },
  settings: {
    title: "Settings",
    description: "Rollout, human handoff, follow-ups and audience targeting.",
    Component: SettingsSection,
  },
  operate: {
    title: "Operate",
    description: "Test conversations, hand threads over, send events and run evaluations.",
    Component: OperateSection,
  },
} as const;

export type MetaAgentSectionId = keyof typeof META_AGENT_SECTIONS;

export function MetaAgentSection({ section }: Readonly<{ section: MetaAgentSectionId }>) {
  const { waSettingsId } = useMetaAgentContext();
  const { title, description, Component } = META_AGENT_SECTIONS[section];

  // The layout only renders us once the channel list has resolved, but an org
  // with no channels never gets here at all.
  if (!waSettingsId) return null;

  return (
    <div className="min-w-0 space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Component waSettingsId={waSettingsId} />
    </div>
  );
}
