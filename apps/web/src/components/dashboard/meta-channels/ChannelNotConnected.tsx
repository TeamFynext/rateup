// Shown in place of the workspace when nothing is connected: what the channel page does once
// an account is, and the way to connect one.

import { Button } from "@rateup/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@rateup/ui/components/empty";
import { IconArrowRight, type TablerIcon } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { ChannelBrandTile } from "./ChannelBrandTile.tsx";
import { CHANNELS, type MetaChannel } from "./channels.ts";

export interface ChannelFeature {
  icon: TablerIcon;
  title: string;
  description: string;
}

export interface NotConnectedCopy {
  title: string;
  description: string;
  actionLabel: string;
  /** Three things the page does once connected. */
  features: readonly ChannelFeature[];
}

export function ChannelNotConnected({
  channel,
  copy,
}: Readonly<{ channel: MetaChannel; copy: NotConnectedCopy }>) {
  return (
    <Empty className="rounded-xl border bg-card py-12 shadow-xs">
      <EmptyHeader className="max-w-md">
        <EmptyMedia>
          <ChannelBrandTile channel={channel} className="size-14 rounded-2xl [&>svg]:size-7" />
        </EmptyMedia>
        <EmptyTitle className="text-xl">{copy.title}</EmptyTitle>
        <EmptyDescription>{copy.description}</EmptyDescription>
      </EmptyHeader>
      <ul className="grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
        {copy.features.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex flex-col gap-2 rounded-xl border bg-muted/40 p-4">
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <Icon className="size-4.5" />
            </span>
            <span className="text-sm font-medium">{title}</span>
            <span className="text-xs leading-relaxed text-muted-foreground">{description}</span>
          </li>
        ))}
      </ul>
      <EmptyContent>
        <Button
          render={
            <Link
              to="/dashboard/settings/channels/$channel"
              params={{ channel: CHANNELS[channel].settingsSlug }}
            />
          }
        >
          {copy.actionLabel}
          <IconArrowRight data-icon="inline-end" />
        </Button>
      </EmptyContent>
    </Empty>
  );
}
