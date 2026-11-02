import {
  IconHandFinger,
  IconLink,
  IconMenu2,
  IconMessageDots,
  IconMessageQuestion,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useChannels } from "@/backend/channels/channels.query";
import { useMessengerProfile } from "@/backend/whatsapp/messenger-profile/messengerProfile.query";
import { useRules } from "@/backend/whatsapp/rule/rule.query";
import { MessengerCommentsTab } from "@/components/dashboard/messenger/MessengerCommentsTab.tsx";
import { MESSENGER_LIMITS } from "@/components/dashboard/messenger/messengerProfile.ts";
import {
  MessengerIceBreakersTool,
  MessengerMenuTool,
  MessengerWelcomeTool,
} from "@/components/dashboard/messenger/MessengerProfileTab.tsx";
import { MMeLinksTab } from "@/components/dashboard/messenger/MMeLinksTab.tsx";
import type { ToolStatus } from "@/components/dashboard/meta-channels/ChannelOverview.tsx";
import {
  type ChannelTool,
  ChannelPageShell,
} from "@/components/dashboard/meta-channels/ChannelPageShell.tsx";
import {
  MESSENGER_TOOLS,
  type MessengerTool,
  toolSearch,
} from "@/components/dashboard/meta-channels/toolSearch.ts";
import {
  iceBreakersStatus,
  linksStatus,
  matchingRules,
  menuStatus,
  rulesStatus,
  unknownStatus,
} from "@/components/dashboard/meta-channels/toolStatus.ts";

export const Route = createFileRoute("/dashboard/messenger/")({
  validateSearch: toolSearch(MESSENGER_TOOLS),
  component: MessengerPage,
});

/** Comments, m.me links and the welcome screen of a Facebook Page. Its chatbots live in Journeys. */
function MessengerPage() {
  const { t } = useTranslation();
  const { tool } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: pages, isPending } = useChannels(true, "FACEBOOK");
  const [selectedId, setSelectedId] = useState<string>();
  // Comments, m.me links and the welcome screen belong to one Page; the first is picked until the user chooses.
  const page = pages?.find((p) => p.id === selectedId) ?? pages?.[0];
  const pageName = page?.name || "";

  // The same queries the tools read, so the tiles cost no extra requests.
  const { data: rules } = useRules();
  const { data: profile, isError: profileError } = useMessengerProfile(page?.id);
  const forPage = (trigger: string) =>
    rules && page ? matchingRules(rules, "FACEBOOK", trigger, page.accountId) : undefined;

  const welcomeStatus = (): ToolStatus | undefined => {
    if (profileError) return unknownStatus(t);
    if (!profile) return undefined;
    if (!profile.getStarted && !profile.greeting) return { tone: "idle", text: t("Not set up") };
    const parts = [
      profile.getStarted ? t("Get Started on") : t("Get Started off"),
      ...(profile.greeting ? [t("Greeting set")] : []),
    ];
    return { tone: profile.getStarted ? "live" : "idle", text: parts.join(" · ") };
  };

  const tools: ChannelTool<MessengerTool>[] = page
    ? [
        {
          value: "comments",
          label: t("Comment automations"),
          icon: IconMessageDots,
          status: rulesStatus(forPage("FACEBOOK_COMMENT"), t),
          content: <MessengerCommentsTab pageId={page.accountId} />,
        },
        {
          value: "m-me-links",
          label: t("m.me links"),
          icon: IconLink,
          status: linksStatus(forPage("MESSENGER_REFERRAL"), t),
          content: <MMeLinksTab pageId={page.accountId} />,
        },
        {
          value: "welcome",
          label: t("Welcome screen"),
          icon: IconHandFinger,
          status: welcomeStatus(),
          content: <MessengerWelcomeTool channelId={page.id} pageName={pageName} />,
        },
        {
          value: "persistent-menu",
          label: t("Persistent menu"),
          icon: IconMenu2,
          status: profileError ? unknownStatus(t) : menuStatus(profile?.persistentMenu.length, t),
          content: <MessengerMenuTool channelId={page.id} pageName={pageName} />,
        },
        {
          value: "ice-breakers",
          label: t("Ice breakers"),
          icon: IconMessageQuestion,
          status: profileError
            ? unknownStatus(t)
            : iceBreakersStatus(profile?.iceBreakers.length, MESSENGER_LIMITS.iceBreakers, t),
          content: <MessengerIceBreakersTool channelId={page.id} pageName={pageName} />,
        },
      ]
    : [];

  return (
    <ChannelPageShell
      channel="messenger"
      title={t("Messenger")}
      description={t("Comments, links and the welcome screen for your Facebook Page.")}
      journeysLabel={t("Messenger journeys")}
      journeysHint={t("Step-by-step conversations in Messenger")}
      accounts={pages?.map((p) => ({
        id: p.id,
        label: p.name || p.accountId,
        handle: t("Facebook Page"),
        status: p.status,
        profileUrl: `https://facebook.com/${p.accountId}`,
      }))}
      isLoading={isPending}
      selectedId={page?.id}
      onSelect={setSelectedId}
      accountLabel={t("Facebook Page")}
      notConnected={{
        title: t("Connect a Facebook Page"),
        description: t(
          "Comment automations, m.me links and Messenger journeys run on a connected Facebook Page. Connect one to get started.",
        ),
        actionLabel: t("Connect Facebook Page"),
        features: [
          {
            icon: IconMessageDots,
            title: t("Reply to comments"),
            description: t("Answer comments on your Page's posts privately in Messenger."),
          },
          {
            icon: IconHandFinger,
            title: t("Welcome new chats"),
            description: t("A greeting, Get Started button, ice breakers and a menu."),
          },
          {
            icon: IconLink,
            title: t("Share m.me links"),
            description: t("Links and QR codes that open a chat and start an automation."),
          },
        ],
      }}
      tools={tools}
      activeTool={tool}
      onToolChange={(next) =>
        void navigate({ search: { tool: next }, replace: false, resetScroll: false })
      }
    />
  );
}
