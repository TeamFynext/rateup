// The agent's setup guide: the page the sidebar's "Meta AI Agent" opens on. It
// follows the RateUp setup guide (`dashboard/setup/RateUpOnboarding.tsx`): a
// welcome with progress, the required Meta steps in a dashed well, then each
// area of the agent as a row that opens the page where you finish it.

import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconRefresh,
  IconShieldCheck,
  IconTrash,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
  useCheckAgentEligibility,
  useDeleteAgent,
  useMetaBusinessAgent,
  useOnboardAgent,
} from "@/backend/metaAgent/metaAgent.query";
import { PageHeading, SectionHeading } from "@/components/common/page-heading.tsx";
import { SetupRowCard } from "@/components/common/setup-row-card.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/context/confirm-provider";

import { StepIconChip } from "../../loyalty/onboarding/StepChrome.tsx";
import {
  AGENT_STEP_META,
  AGENT_STEPS,
  type AgentSetupProgress,
  type AgentStep,
  type AgentStepGroup,
} from "../setup/agentSetup.ts";
import { useAgentSetup } from "../setup/useAgentSetup.ts";

const GROUPS: { id: Exclude<AgentStepGroup, "connect">; title: string; hint: string }[] = [
  {
    id: "teach",
    title: "Teach your agent",
    hint: "The more it knows, the fewer chats reach your team",
  },
  {
    id: "extend",
    title: "Go further",
    hint: "Optional — richer replies and live data from your own systems",
  },
  {
    id: "launch",
    title: "Test and go live",
    hint: "Try it yourself, then choose who it answers",
  },
];

export function OverviewSection({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const setup = useAgentSetup(waSettingsId);

  if (setup.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6.5">
      <GuideHero setup={setup} />

      <section className="flex flex-col gap-3">
        <SectionHeading
          title="Connect to Meta"
          hint="Meta has to approve the number before the agent can exist"
          badge={<Badge variant="system">Required</Badge>}
        />
        <ConnectSteps waSettingsId={waSettingsId} />
      </section>

      {GROUPS.map((group) => (
        <section key={group.id} className="flex flex-col gap-3">
          <SectionHeading title={group.title} hint={group.hint} />
          <div className="flex flex-col gap-3">
            {AGENT_STEPS.filter((step) => AGENT_STEP_META[step].group === group.id).map((step) => (
              <StepRow key={step} step={step} setup={setup} />
            ))}
          </div>
        </section>
      ))}

      <DangerZone waSettingsId={waSettingsId} />
    </div>
  );
}

/** Welcome and progress while there is work left; a "you're live" banner after. */
function GuideHero({ setup }: Readonly<{ setup: AgentSetupProgress }>) {
  const navigate = useNavigate();

  if (setup.live) {
    return (
      <div className="flex flex-wrap items-center gap-5 rounded-xl bg-ru-blue-900 p-6">
        <StepIconChip tone="green" className="size-11 [&>svg]:size-6">
          <IconCircleCheck />
        </StepIconChip>
        <div className="flex min-w-55 flex-1 flex-col gap-1.5">
          <span className="font-display text-2xl font-bold tracking-[-0.02em] text-white">
            Your agent is live.
          </span>
          <span className="text-[14.5px] leading-normal text-white/70">
            It is answering customers on WhatsApp. Keep teaching it below — every change reaches
            Meta as soon as you save.
          </span>
        </div>
        <Button
          size="lg"
          variant="secondary"
          onClick={() => navigate({ to: AGENT_STEP_META.operate.to })}
        >
          Open test console
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-7">
      <div className="flex min-w-[min(100%,26rem)] flex-1">
        <PageHeading
          title="Put an AI agent on your WhatsApp."
          description="Connect with Meta, teach the agent about your business, test it, then switch it on. Nothing reaches customers until you do."
        />
      </div>

      <div className="flex w-65 shrink-0 flex-col gap-2">
        <div className="flex items-baseline justify-between text-[13px] text-muted-foreground">
          <span>
            {setup.done} of {setup.total} complete
          </span>
          <span>{setup.minsLeft} min left</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-in-out"
            style={{ width: `${setup.pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Meta's onboarding is strictly ordered — a number has to be eligible before it
 * can be onboarded — so the two calls are two rows, the second waiting on the
 * first. Each calls Meta once, when pressed; nothing runs on page load.
 */
function ConnectSteps({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { data: agent } = useMetaBusinessAgent(waSettingsId);
  const checkEligibility = useCheckAgentEligibility(waSettingsId);
  const onboard = useOnboardAgent(waSettingsId);

  const onboarded = agent?.status === "ONBOARDED";
  const eligible = agent?.isEligible === true || onboarded;
  const ineligible = agent?.isEligible === false && !onboarded;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-input bg-muted p-3.5">
      <SetupRowCard
        icon={IconShieldCheck}
        tint="green"
        title="Check eligibility"
        done={eligible}
        badges={
          eligible ? (
            <DoneBadge />
          ) : ineligible ? (
            <Badge variant="destructive">
              <IconCircleX size={12} />
              Not eligible
            </Badge>
          ) : null
        }
        description={
          ineligible
            ? "Meta says this number cannot run a Business Agent yet."
            : eligible
              ? "Meta confirmed this number can run a Business Agent."
              : "Ask Meta whether this WhatsApp number can run a Business Agent."
        }
        detail={
          ineligible ? (
            <Alert variant="destructive" className="mt-2">
              <IconAlertTriangle />
              <AlertTitle>What decides eligibility</AlertTitle>
              <AlertDescription>
                Your business vertical and country, and whether the Meta Business Agent terms are
                accepted in WhatsApp Manager. Check again once those are in place.
              </AlertDescription>
            </Alert>
          ) : null
        }
        action={
          <Button
            variant={eligible ? "secondary" : "default"}
            className="h-10 w-full"
            loading={checkEligibility.isPending}
            onClick={() => checkEligibility.mutate()}
          >
            <IconRefresh data-icon="inline-start" />
            {eligible || ineligible ? "Check again" : "Check with Meta"}
          </Button>
        }
      />

      <SetupRowCard
        icon={AGENT_STEP_META.overview.icon}
        tint="green"
        title="Create the agent"
        done={onboarded}
        muted={!eligible}
        badges={
          onboarded ? (
            <DoneBadge />
          ) : !eligible ? (
            <Badge variant="secondary">Waiting on eligibility</Badge>
          ) : null
        }
        description={
          onboarded ? (
            <>
              Created on the {agent?.channel} channel.{" "}
              {agent?.agentId && <AgentIdReveal agentId={agent.agentId} />}
            </>
          ) : (
            "Creates the agent at Meta. Everything you set up next is attached to it."
          )
        }
        action={
          <Button
            variant={onboarded ? "secondary" : "default"}
            className="h-10 w-full"
            disabled={!eligible}
            loading={onboard.isPending}
            // No catalog id: Meta keeps the catalog already linked to the number.
            onClick={() => onboard.mutate({})}
          >
            {onboarded ? "Re-create agent" : "Create agent"}
          </Button>
        }
      />
    </div>
  );
}

/** Copy for the row of each area, from what is already saved for it. */
function rowCopy(step: AgentStep, setup: AgentSetupProgress) {
  const { facts } = setup;
  const done = setup.status[step] === true;

  switch (step) {
    case "knowledge":
      return {
        title: "Add what it knows",
        detail: done ? "The agent has knowledge to answer from." : null,
        action: done ? "Edit knowledge" : "Add knowledge",
      };
    case "skills":
      return {
        title: "Write skills",
        detail: done ? `${facts.skillCount} written` : null,
        action: done ? "Edit skills" : "Write a skill",
      };
    case "ui-skills":
      return {
        title: "Send rich replies",
        detail: done ? `${facts.uiSkillCount} set up` : null,
        action: done ? "Edit rich replies" : "Add a rich reply",
      };
    case "connectors":
      return {
        title: "Connect your systems",
        detail: done ? `${facts.connectorCount} connected` : null,
        action: done ? "Manage connectors" : "Add a connector",
      };
    case "operate":
      return { title: "Test the agent", detail: null, action: "Open test console" };
    case "insights":
      return {
        title: "See how it is doing",
        detail: setup.live ? null : "Most useful once the agent is live.",
        action: "Open insights",
      };
    case "settings":
      return {
        title: "Switch it on",
        detail: facts.rolloutEnabled ? null : "Off — the agent is not answering anyone.",
        action: done ? "Review settings" : "Go live",
      };
    default:
      return { title: AGENT_STEP_META[step].label, detail: null, action: "Open" };
  }
}

function StepRow({ step, setup }: Readonly<{ step: AgentStep; setup: AgentSetupProgress }>) {
  const navigate = useNavigate();
  const meta = AGENT_STEP_META[step];
  const { title, detail, action } = rowCopy(step, setup);
  const done = setup.status[step] === true;
  // Everything past the connect steps is attached to the agent, so it waits on it.
  const blocked = !setup.facts.onboarded;

  return (
    <SetupRowCard
      icon={meta.icon}
      tint={meta.tint}
      title={title}
      description={meta.description}
      done={done}
      muted={blocked}
      badges={
        <>
          {done && <DoneBadge />}
          {blocked && <Badge variant="secondary">Waiting on Meta</Badge>}
          {!done && !blocked && meta.group === "extend" && (
            <Badge variant="outline">Optional</Badge>
          )}
        </>
      }
      detail={detail ? <span className="text-xs text-muted-foreground">{detail}</span> : null}
      action={
        <Button
          variant={done ? "secondary" : "default"}
          disabled={blocked}
          className="h-10 w-full"
          onClick={() => navigate({ to: meta.to })}
        >
          {action}
        </Button>
      }
      actionFooter={<span className="text-xs text-muted-foreground">{meta.minutes} min</span>}
    />
  );
}

function DoneBadge() {
  return (
    <Badge className="bg-green-600/10 text-green-700 dark:text-green-500">
      <IconCircleCheck size={12} />
      Done
    </Badge>
  );
}

function DangerZone({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { data: agent } = useMetaBusinessAgent(waSettingsId);
  const deleteAgent = useDeleteAgent(waSettingsId);
  const confirm = useConfirm();

  if (agent?.status !== "ONBOARDED") return null;

  const onDelete = async () => {
    const ok = await confirm({
      title: "Delete this Business Agent?",
      description:
        "Meta will drop the agent and everything configured on it — business info, FAQs, files, websites, skills, rich replies and connectors. This cannot be undone; you would have to set it up again from scratch.",
      confirmText: "Delete agent",
    });
    if (ok) deleteAgent.mutate();
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">Delete the agent</CardTitle>
        <CardDescription>
          Removes the agent at Meta and clears every knowledge item, skill and connector mirrored
          here. Meta says eligibility can change, so the number is checked again before a new agent
          is created.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" size="sm" loading={deleteAgent.isPending} onClick={onDelete}>
          <IconTrash data-icon="inline-start" />
          Delete agent
        </Button>
      </CardContent>
    </Card>
  );
}

/** The Meta agent id stays hidden until asked for; it is only needed for support. */
function AgentIdReveal({ agentId }: Readonly<{ agentId: string }>) {
  const [shown, setShown] = useState(false);
  return (
    <span className="inline-flex items-center gap-1.5">
      {shown && <code className="rounded bg-muted px-1 py-0.5 text-xs">{agentId}</code>}
      <button
        type="button"
        className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        aria-expanded={shown}
        onClick={() => setShown((value) => !value)}
      >
        {shown ? "Hide agent ID" : "Show agent ID"}
      </button>
    </span>
  );
}
