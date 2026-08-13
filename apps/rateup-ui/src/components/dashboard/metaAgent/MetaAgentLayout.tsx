import { IconCircleCheck, IconCircleDashed, IconRocket } from "@tabler/icons-react";
import { Outlet } from "@tanstack/react-router";

import { useMetaBusinessAgent } from "@/backend/metaAgent/metaAgent.query";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
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

import { MetaAgentProvider, useMetaAgentContext } from "./MetaAgentContext";

/**
 * Wraps every Meta Business Agent section. The sections themselves are routes,
 * listed under "Meta AI Agent" in the main sidebar — so this holds only what is
 * common to all of them: which channel you are configuring, and whether its
 * agent exists yet.
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
      <div className="mx-auto max-w-3xl py-10">
        <Empty className="rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconRocket />
            </EmptyMedia>
            <EmptyTitle>No WhatsApp channel connected</EmptyTitle>
            <EmptyDescription>
              Connect a WhatsApp number under Settings &rarr; Channels before configuring the Meta
              Business Agent.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div className="flex flex-col gap-2">
          <Badge variant="secondary" className="w-fit">
            <IconRocket data-icon="inline-start" />
            Meta Business Agent
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">AI Agent for WhatsApp</h1>
        </div>
        <div className="flex items-center gap-3">
          {!!waSettingsId && <AgentStatusBadge waSettingsId={waSettingsId} />}
          {!!channels.length && (
            <Select
              value={waSettingsId}
              onValueChange={(value) => value && setWaSettingsId(value)}
              items={channels.map((channel) => ({ value: channel.id, label: channel.label }))}
            >
              <SelectTrigger className="w-56">
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
          )}
        </div>
      </header>

      {isLoading ? <Skeleton className="h-96 w-full rounded-xl" /> : <Outlet />}
    </div>
  );
}

function AgentStatusBadge({ waSettingsId }: Readonly<{ waSettingsId: string }>) {
  const { data: agent, isLoading } = useMetaBusinessAgent(waSettingsId);
  if (isLoading) return <Skeleton className="h-6 w-28" />;

  const onboarded = agent?.status === "ONBOARDED";
  return (
    <Badge variant={onboarded ? "default" : "secondary"}>
      {onboarded ? (
        <IconCircleCheck data-icon="inline-start" />
      ) : (
        <IconCircleDashed data-icon="inline-start" />
      )}
      {onboarded ? "Onboarded" : "Not onboarded"}
    </Badge>
  );
}
