import {
  IconHistory,
  IconLink,
  IconMenu2,
  IconMessageDots,
  IconMessageQuestion,
} from "@tabler/icons-react";
import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useChannels } from "@/backend/channels/channels.query";
import { useInstagramProfile } from "@/backend/whatsapp/instagram-profile/instagramProfile.query";
import { useRules } from "@/backend/whatsapp/rule/rule.query";
import {
  type ChannelTool,
  ChannelPageShell,
} from "@/components/dashboard/meta-channels/ChannelPageShell.tsx";
import type { InstagramTool } from "@/components/dashboard/meta-channels/toolSearch.ts";
import {
  iceBreakersStatus,
  linksStatus,
  matchingRules,
  menuStatus,
  rulesStatus,
  unknownStatus,
} from "@/components/dashboard/meta-channels/toolStatus.ts";

import { CommentsTab } from "./tabs/CommentsTab.tsx";
import { IceBreakersTab } from "./tabs/IceBreakersTab.tsx";
import { IgMeLinksTab } from "./tabs/IgMeLinksTab.tsx";
import { PersistentMenuTab } from "./tabs/PersistentMenuTab.tsx";
import { StoriesTab } from "./tabs/StoriesTab.tsx";

const route = getRouteApi("/dashboard/instagram/");

/** Comments, story mentions, menus, ice breakers and ig.me links of one Instagram account. */
export function InstagramDashboard() {
  const { t } = useTranslation();
  const { tool } = route.useSearch();
  const navigate = route.useNavigate();
  // Instagram accounts are their own channels, connected without WhatsApp.
  const { data: accounts, isLoading } = useChannels(true, "INSTAGRAM");
  const [selectedId, setSelectedId] = useState<string>();
  // Everything below belongs to one account; the first is picked until the user chooses.
  const account = accounts?.find((a) => a.id === selectedId) ?? accounts?.[0];
  const businessName = account?.name || account?.username || "";

  // The same queries the tools read, so the tiles cost no extra requests.
  const { data: rules } = useRules();
  const profile = useInstagramProfile(account?.id);
  const forAccount = (trigger: string) =>
    rules && account ? matchingRules(rules, "INSTAGRAM", trigger, account.accountId) : undefined;
  // The Stories tool holds both story mention and story reply rules.
  const storyRules = () => {
    const mentions = forAccount("INSTAGRAM_STORY_MENTION");
    const replies = forAccount("INSTAGRAM_STORY_REPLY");
    return mentions && replies ? [...replies, ...mentions] : undefined;
  };

  const tools: ChannelTool<InstagramTool>[] = account
    ? [
        {
          value: "comments",
          label: t("Comment automations"),
          icon: IconMessageDots,
          status: rulesStatus(forAccount("INSTAGRAM_COMMENT"), t),
          content: <CommentsTab ibaId={account.accountId} />,
        },
        {
          value: "stories",
          label: t("Stories"),
          icon: IconHistory,
          status: rulesStatus(storyRules(), t),
          content: <StoriesTab ibaId={account.accountId} />,
        },
        {
          value: "persistent-menu",
          label: t("Persistent menu"),
          icon: IconMenu2,
          status: profile.isError
            ? unknownStatus(t)
            : menuStatus(
                profile.data
                  ? (profile.data.data.persistentMenu?.[0]?.call_to_actions?.length ?? 0)
                  : undefined,
                t,
              ),
          content: <PersistentMenuTab channelId={account.id} businessName={businessName} />,
        },
        {
          value: "ice-breakers",
          label: t("Ice breakers"),
          icon: IconMessageQuestion,
          status: profile.isError
            ? unknownStatus(t)
            : iceBreakersStatus(
                profile.data ? (profile.data.data.iceBreakers?.length ?? 0) : undefined,
                4,
                t,
              ),
          content: <IceBreakersTab channelId={account.id} businessName={businessName} />,
        },
        {
          value: "ig-me-links",
          label: t("ig.me links"),
          icon: IconLink,
          status: linksStatus(forAccount("INSTAGRAM_REFERRAL"), t),
          content: (
            <IgMeLinksTab
              ibaId={account.accountId}
              username={account.username}
              displayName={account.name}
            />
          ),
        },
      ]
    : [];

  return (
    <ChannelPageShell
      channel="instagram"
      title={t("Instagram")}
      description={t("Comments, story mentions, links and DM menus for your account.")}
      journeysLabel={t("Instagram journeys")}
      journeysHint={t("Step-by-step conversations in your Instagram DMs")}
      accounts={accounts?.map((a) => ({
        id: a.id,
        label: a.name || (a.username ? `@${a.username}` : a.accountId),
        // The handle under the name, unless the name already is the handle.
        handle: a.username && a.name ? `@${a.username}` : undefined,
        status: a.status,
        profileUrl: a.username ? `https://instagram.com/${a.username}` : undefined,
      }))}
      isLoading={isLoading}
      selectedId={account?.id}
      onSelect={setSelectedId}
      accountLabel={t("Instagram account")}
      notConnected={{
        title: t("Connect an Instagram account"),
        description: t(
          "Comment automations, ice breakers and ig.me links run on a connected Instagram Business account. Connect one to get started.",
        ),
        actionLabel: t("Connect Instagram account"),
        features: [
          {
            icon: IconMessageDots,
            title: t("Reply to comments"),
            description: t("Send a private DM when someone comments on a post or reel."),
          },
          {
            icon: IconMessageQuestion,
            title: t("Greet new DMs"),
            description: t("Ice breakers and a menu people can tap instead of typing."),
          },
          {
            icon: IconLink,
            title: t("Share ig.me links"),
            description: t("Links and QR codes that open a DM and start an automation."),
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
