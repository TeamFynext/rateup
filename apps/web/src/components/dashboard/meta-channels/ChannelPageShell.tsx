// The channel home the Instagram and Messenger pages share: the header with the connected
// account, a strip of tool tiles saying where each tool stands, the workspace (tool list on the
// left, the chosen tool on the right) and the channel's journeys. Each page supplies its copy,
// accounts and tools; everything they show the same way lives here.

import { Button } from "@rateup/ui/components/button";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { IconSitemap } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { PageHeading } from "@/components/common/page-heading.tsx";

import { ChannelBrandTile } from "./ChannelBrandTile.tsx";
import { type ChannelAccountOption, ChannelIdentity } from "./ChannelIdentity.tsx";
import { ChannelJourneys } from "./ChannelJourneys.tsx";
import { ChannelNotConnected, type NotConnectedCopy } from "./ChannelNotConnected.tsx";
import {
  ChannelOverview,
  ChannelOverviewSkeleton,
  type ChannelToolSummary,
} from "./ChannelOverview.tsx";
import type { MetaChannel } from "./channels.ts";

export interface ChannelTool<T extends string = string> extends ChannelToolSummary<T> {
  content: ReactNode;
}

export interface ChannelPageShellProps<T extends string> {
  channel: MetaChannel;
  title: string;
  description: string;
  /** "Instagram journeys": the header button and the journeys section's title. */
  journeysLabel: string;
  /** One line beside the journeys section's title. */
  journeysHint: string;
  /** The connected accounts (Instagram) or Pages (Messenger); `undefined` while loading. */
  accounts: readonly ChannelAccountOption[] | undefined;
  isLoading: boolean;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  /** The picker's accessible name, e.g. "Instagram account". */
  accountLabel: string;
  /** Shown instead of the workspace when nothing is connected. */
  notConnected: NotConnectedCopy;
  tools: readonly ChannelTool<T>[];
  /** From `?tool=`; the first tool when absent. */
  activeTool: T | undefined;
  onToolChange: (tool: T) => void;
}

export function ChannelPageShell<T extends string>({
  channel,
  title,
  description,
  journeysLabel,
  journeysHint,
  accounts,
  isLoading,
  selectedId,
  onSelect,
  accountLabel,
  notConnected,
  tools,
  activeTool,
  onToolChange,
}: Readonly<ChannelPageShellProps<T>>) {
  const connected = accounts ?? [];
  const selected = connected.find((a) => a.id === selectedId) ?? connected[0];
  const active = tools.find((tool) => tool.value === activeTool) ?? tools[0];

  // A tile opens its tool and brings the workspace into view; the nav beside it only switches.
  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-6">
      <PageHeading
        icon={<ChannelBrandTile channel={channel} />}
        title={title}
        description={description}
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {isLoading ? (
              <Skeleton className="h-11 w-64 rounded-xl" />
            ) : selected ? (
              <ChannelIdentity
                channel={channel}
                accounts={connected}
                selected={selected}
                onSelect={onSelect}
                accountLabel={accountLabel}
              />
            ) : null}
            <Button
              variant="outline"
              render={<Link to="/dashboard/automation/journeys" search={{ channel }} />}
            >
              <IconSitemap data-icon="inline-start" />
              {journeysLabel}
            </Button>
          </div>
        }
      />

      {isLoading && (
        <>
          <ChannelOverviewSkeleton />
          <Skeleton className="h-80 rounded-xl" />
        </>
      )}

      {!isLoading && !selected && <ChannelNotConnected channel={channel} copy={notConnected} />}

      {!isLoading && selected && active && (
        <>
          {/* The tiles are the tool picker: each shows its tool's status and opens it below. */}
          <ChannelOverview tools={tools} active={active.value} onOpen={onToolChange} />

          {/* Keyed so switching account or tool starts the tool from what is live. */}
          <div key={`${selected.id}-${active.value}`} className="min-w-0">
            {active.content}
          </div>

          <ChannelJourneys channel={channel} title={journeysLabel} hint={journeysHint} />
        </>
      )}
    </div>
  );
}
