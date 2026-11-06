// The channel's journeys at a glance: up to three, live ones first, with the way to the full
// list and to a new one on this channel.

import { IconArrowRight, IconPlus, IconSitemap } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useChatbots } from "@/backend/chatbots/chatbots.query.ts";
import { SectionHeading } from "@/components/common/page-heading.tsx";
import {
  ActiveSwitch,
  useRunsLabel,
  useStepLabel,
} from "@/components/dashboard/chatbots/ChatbotCards.tsx";
import { CreateChatbotWizard } from "@/components/dashboard/chatbots/CreateChatbotWizard/CreateChatbotWizard.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

import { ToolStatusDot } from "./ChannelOverview.tsx";
import { CHANNELS, type MetaChannel } from "./channels.ts";

const SHOWN = 3;

export function ChannelJourneys({
  channel,
  title,
  hint,
}: Readonly<{
  channel: MetaChannel;
  /** "Instagram journeys". */
  title: string;
  hint: string;
}>) {
  const { t } = useTranslation();
  const steps = useStepLabel();
  const runs = useRunsLabel();
  const [creating, setCreating] = useState(false);
  const { platform } = CHANNELS[channel];
  const { data, isPending } = useChatbots(platform);

  const all = data?.data ?? [];
  const shown = useMemo(
    () =>
      [...all]
        .sort(
          (a, b) =>
            Number(b.isActive) - Number(a.isActive) ||
            Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
        )
        .slice(0, SHOWN),
    [all],
  );

  const create = (
    <Button size="sm" onClick={() => setCreating(true)}>
      <IconPlus data-icon="inline-start" />
      {t("Create journey")}
    </Button>
  );

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading
        title={title}
        hint={hint}
        actions={
          all.length > 0 ? (
            <span className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                render={<Link to="/dashboard/automation/journeys" search={{ channel }} />}
              >
                {t("See all {count}", { count: all.length })}
                <IconArrowRight data-icon="inline-end" />
              </Button>
              {create}
            </span>
          ) : null
        }
      />

      {isPending ? (
        <Skeleton className="h-36 w-full rounded-xl" />
      ) : shown.length === 0 ? (
        <Empty className="rounded-xl border py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconSitemap />
            </EmptyMedia>
            <EmptyTitle>{t("No journeys yet")}</EmptyTitle>
            <EmptyDescription>
              {t("A journey is a chatbot: a conversation that runs step by step in the chat.")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{create}</EmptyContent>
        </Empty>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
          {shown.map((journey) => (
            <li key={journey.id} className="flex items-center gap-3 px-4 py-3">
              <ToolStatusDot tone={journey.isActive ? "live" : "idle"} />
              <div className="min-w-0 flex-1">
                <Link
                  to="/dashboard/automation/journeys/$journeyId"
                  params={{ journeyId: journey.id }}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {journey.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground tabular-nums">
                  {steps(journey.stepCount)} · {runs(journey.runs)}
                </p>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {journey.isActive ? t("On") : t("Off")}
              </span>
              <ActiveSwitch chatbot={journey} />
            </li>
          ))}
        </ul>
      )}

      {/* Mounted per opening, so every run of the wizard starts fresh on this channel. */}
      {creating && (
        <CreateChatbotWizard open onClose={() => setCreating(false)} initialPlatform={platform} />
      )}
    </section>
  );
}
