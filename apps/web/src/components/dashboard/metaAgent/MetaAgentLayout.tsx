import { IconCircleCheck, IconCircleDashed, IconRocket } from "@tabler/icons-react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

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

  // Each step is a route, and the page scrolls inside its own container rather
  // than the window, so the router's scroll reset never reaches it. Back to the
  // top on every step, as a new page should open.
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const noChannel = !isLoading && !channels.length;

  // The setup guide's shell (`dashboard/setup/RateUpOnboarding.tsx`): a fixed
  // header the height of the nav panel's, so the two bottom borders read as one
  // line across the sidebar and the page, over the page's own scroller.
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-card px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="font-display text-[17px] font-bold tracking-[-0.02em]">
            Meta AI Agent
          </span>
          {!!waSettingsId && <AgentStatusBadge waSettingsId={waSettingsId} />}
          {channels.length === 1 && (
            // One number is not a choice — name it rather than offer a one-item picker.
            <span className="truncate text-sm text-muted-foreground">{channels[0]?.label}</span>
          )}
        </div>
        {channels.length > 1 && (
          <Select
            value={waSettingsId}
            onValueChange={(value) => value && setWaSettingsId(value)}
            items={channels.map((channel) => ({ value: channel.id, label: channel.label }))}
          >
            <SelectTrigger size="sm" className="w-56" aria-label="WhatsApp number">
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
      </header>

      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-6 pt-7 pb-14">
        <div className="mx-auto flex max-w-265 flex-col gap-6.5">
          {isLoading ? (
            <Skeleton className="h-96 w-full rounded-xl" />
          ) : noChannel ? (
            <Empty className="rounded-xl border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconRocket />
                </EmptyMedia>
                <EmptyTitle>Connect WhatsApp first</EmptyTitle>
                <EmptyDescription>
                  The AI agent answers on a WhatsApp number, so it needs one connected before you
                  can set it up.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button render={<Link to="/dashboard/settings/channels" />}>
                  Connect WhatsApp
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
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
