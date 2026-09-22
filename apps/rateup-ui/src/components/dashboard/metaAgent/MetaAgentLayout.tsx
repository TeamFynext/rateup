import { IconCircleCheck, IconCircleDashed, IconRobotFace, IconRocket } from "@tabler/icons-react";
import { Link, Outlet } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { StepIconChip } from "../loyalty/onboarding/StepChrome.tsx";
import { MetaAgentProvider, useMetaAgentContext } from "./MetaAgentContext";
import { useAgentSetup } from "./setup/useAgentSetup.ts";

/**
 * Wraps every Meta Business Agent page. The overview is the setup guide and the
 * rest are its steps, each a route listed under "Meta AI Agent" in the sidebar —
 * so this holds only what is common to all of them: which channel you are
 * configuring, and whether its agent is live.
 */
export function MetaAgentLayout() {
  return (
    <MetaAgentProvider>
      <MetaAgentShell />
    </MetaAgentProvider>
  );
}

function MetaAgentShell() {
  const { waSettingsId, setWaSettingsId, channels, isLoading } = useMetaAgentContext();

  if (!isLoading && !channels.length) {
    return (
      <div className="mx-auto w-full max-w-265 py-10">
        <Empty className="rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconRocket />
            </EmptyMedia>
            <EmptyTitle>Connect WhatsApp first</EmptyTitle>
            <EmptyDescription>
              The AI agent answers on a WhatsApp number, so it needs one connected before you can
              set it up.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link to="/dashboard/settings/channels" />}>Connect WhatsApp</Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-6 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <StepIconChip tone="blue" size="sm">
            <IconRobotFace />
          </StepIconChip>
          <span className="font-display text-[17px] font-bold tracking-[-0.02em]">
            Meta AI Agent
          </span>
          {!!waSettingsId && <AgentStatusBadge waSettingsId={waSettingsId} />}
        </div>
        {channels.length > 1 ? (
          <Select
            value={waSettingsId}
            onValueChange={(value) => value && setWaSettingsId(value)}
            items={channels.map((channel) => ({ value: channel.id, label: channel.label }))}
          >
            <SelectTrigger className="w-56" aria-label="WhatsApp number">
              <SelectValue placeholder="Select WhatsApp number" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channel.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          // One number is not a choice — name it rather than offer a one-item picker.
          <span className="truncate text-sm text-muted-foreground">{channels[0]?.label}</span>
        )}
      </header>

      {isLoading ? <Skeleton className="h-96 w-full rounded-xl" /> : <Outlet />}
    </div>
  );
}

/** Where the agent stands: live, created but switched off, or not created yet. */
function AgentStatusBadge({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { isLoading, live, facts } = useAgentSetup(waSettingsId);
  if (isLoading) return <Skeleton className="h-5 w-20" />;

  if (live) {
    return (
      <Badge className="bg-green-600/10 text-green-700 dark:text-green-500">
        <IconCircleCheck data-icon="inline-start" />
        Live
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <IconCircleDashed data-icon="inline-start" />
      {facts.onboarded ? "Off" : "Not set up"}
    </Badge>
  );
}
