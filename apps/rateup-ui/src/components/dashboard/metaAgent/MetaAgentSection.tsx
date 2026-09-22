import { IconArrowLeft, IconArrowRight, IconInfoCircle } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";

import { SECTION_TITLE } from "@/components/common/page-heading.tsx";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Stepper, type StepperStep } from "@/components/ui/stepper.tsx";

import { StepIconChip, StepTransition } from "../loyalty/onboarding/StepChrome.tsx";
import { ConnectorsSection } from "./components/ConnectorsSection";
import { KnowledgeSection } from "./components/KnowledgeSection";
import { OperateSection } from "./components/OperateSection";
import { OverviewSection } from "./components/OverviewSection";
import { SettingsSection } from "./components/SettingsSection";
import { SkillsSection } from "./components/SkillsSection";
import { UiSkillsSection } from "./components/UiSkillsSection";
import { useMetaAgentContext } from "./MetaAgentContext";
import { AGENT_STEP_META, AGENT_STEPS, type AgentStep } from "./setup/agentSetup.ts";
import { useAgentSetup } from "./setup/useAgentSetup.ts";

/**
 * Each area's component. Its name, blurb, icon and place in the flow live in
 * `AGENT_STEP_META`; the route files are one line each.
 */
const SECTION_COMPONENTS: Record<
  Exclude<AgentStep, "overview">,
  React.ComponentType<{ waSettingsId: string }>
> = {
  knowledge: KnowledgeSection,
  skills: SkillsSection,
  "ui-skills": UiSkillsSection,
  connectors: ConnectorsSection,
  operate: OperateSection,
  settings: SettingsSection,
};

export type MetaAgentSectionId = AgentStep;

export function MetaAgentSection({ section }: Readonly<{ section: MetaAgentSectionId }>) {
  const { waSettingsId } = useMetaAgentContext();

  // The layout only renders us once the channel list has resolved, and an org
  // with no channels gets the empty state there instead.
  if (!waSettingsId) return <Skeleton className="h-96 w-full rounded-xl" />;

  // The overview is the setup guide — the hub the steps hang off, not a step
  // with a rail of its own.
  if (section === "overview") return <OverviewSection waSettingsId={waSettingsId} />;

  return <AgentStepPage step={section} waSettingsId={waSettingsId} />;
}

/**
 * One area of the agent, framed as a step of the setup: the rail across the top
 * (as in loyalty onboarding), the step's heading, the area itself, and Back /
 * Continue to walk the flow in order. Each area still saves on its own, so the
 * footer only moves between pages — nothing is held back until the end.
 */
function AgentStepPage({
  step,
  waSettingsId,
}: Readonly<{ step: Exclude<AgentStep, "overview">; waSettingsId: string }>) {
  const navigate = useNavigate();
  const setup = useAgentSetup(waSettingsId);
  const meta = AGENT_STEP_META[step];
  const Component = SECTION_COMPONENTS[step];
  const Icon = meta.icon;

  const index = AGENT_STEPS.indexOf(step);
  const prev = AGENT_STEPS[index - 1];
  const next = AGENT_STEPS[index + 1];

  const stepperSteps: StepperStep[] = AGENT_STEPS.map((id) => {
    const StepIcon = AGENT_STEP_META[id].icon;
    return {
      id,
      label: AGENT_STEP_META[id].label,
      complete: setup.status[id] === true,
      icon: <StepIcon size={13} />,
      meta: `${AGENT_STEP_META[id].minutes} min`,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <Stepper
        steps={stepperSteps}
        currentStep={step}
        onStepChange={(id) => {
          const target = AGENT_STEPS.find((candidate) => candidate === id);
          if (target) navigate({ to: AGENT_STEP_META[target].to });
        }}
      />

      <StepTransition stepKey={step}>
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex items-start gap-3">
            <StepIconChip tone={meta.tone}>
              <Icon />
            </StepIconChip>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={SECTION_TITLE}>{meta.label}</h1>
                {meta.group === "extend" && <Badge variant="outline">Optional</Badge>}
                {setup.status[step] === true && (
                  <Badge className="bg-green-600/10 text-green-700 dark:text-green-500">Done</Badge>
                )}
              </div>
              <p className="max-w-[66ch] text-sm text-muted-foreground">{meta.description}</p>
            </div>
          </div>

          {!setup.isLoading && !setup.facts.onboarded && (
            <Alert>
              <IconInfoCircle />
              <AlertTitle>Create the agent first</AlertTitle>
              <AlertDescription>
                Everything on this page is attached to the agent at Meta. Check eligibility and
                create the agent on the setup guide, then come back.
              </AlertDescription>
              <AlertAction>
                <Button size="sm" render={<Link to={AGENT_STEP_META.overview.to} />}>
                  Open setup guide
                </Button>
              </AlertAction>
            </Alert>
          )}

          <Component waSettingsId={waSettingsId} />

          <div className="flex items-center justify-between gap-3 border-t pt-4">
            {prev ? (
              <Button variant="ghost" render={<Link to={AGENT_STEP_META[prev].to} />}>
                <IconArrowLeft data-icon="inline-start" />
                {prev === "overview" ? "Setup guide" : AGENT_STEP_META[prev].label}
              </Button>
            ) : (
              <span />
            )}
            {next ? (
              <Button render={<Link to={AGENT_STEP_META[next].to} />}>
                Continue to {AGENT_STEP_META[next].label.toLowerCase()}
                <IconArrowRight data-icon="inline-end" />
              </Button>
            ) : (
              <Button variant="outline" render={<Link to={AGENT_STEP_META.overview.to} />}>
                Back to setup guide
              </Button>
            )}
          </div>
        </div>
      </StepTransition>
    </div>
  );
}
