import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";

import { useContactLabels, useCustomFields } from "@/backend/campaign/contacts/contacts.query";
import { useLifeCyclesQuery } from "@/backend/lifecycle/lifecycle.query";
import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import type { IUserInfoApiResponse } from "@/backend/user/user.api";
import { useUserInfo } from "@/backend/user/user.query";
import { useConversationTags } from "@/backend/whatsapp/inbox/conversationTag/conversationTag.query.ts";
import { useGetInboxUserCount } from "@/backend/whatsapp/inbox/message/wamessage.query.ts";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { getChannelOptions } from "@/components/input/channelOptions.ts";
import { useUser } from "@/context/UserContext.tsx";
import useLocalStorage from "@/hooks/localStorage.tsx";
import { useChatContactCountStore } from "@/store/inbox.store.ts";

import {
  getSignupRedirect,
  getStoredRedirect,
  getUserInfoErrorMessage,
  hasUserPayload,
} from "./main-sidebar.utils.ts";

type UseMainSidebarArgs = Readonly<{
  welcomeMessage: boolean;
}>;

export function useMainSidebar({ welcomeMessage }: UseMainSidebarArgs) {
  const { isPending: isLoadingUserInfo, data, isFetched, refetch, error } = useUserInfo();

  const navigate = useNavigate();
  const location = useRouterState({
    select: (s) => s.location,
  });
  const pathname = location.pathname;
  const search = location.search as Record<string, unknown>;

  const [storedUserInfo, setStoredUserInfo] = useLocalStorage<IUserInfoApiResponse | null>(
    "userInfo",
    null,
  );

  const { setUser } = useUser();
  const welcomeRefetchDone = useRef(false);

  const { data: sub, isPending } = useSubscription();
  const { data: lifecycles, isPending: isPendingLifecycles } = useLifeCyclesQuery();
  const { data: customFieldData, isPending: isCustomFieldPending } = useCustomFields();
  const { data: contactLabels = [], isPending: isPendingContactLabels } = useContactLabels();
  // Inbox-only, but the sidebar is mounted app-wide; the query is cheap and
  // shared with the ticket panel and inbox settings.
  const { data: conversationTags = [] } = useConversationTags();
  const { data: userRes, isLoading: isStaffLoading } = useTeamsMembersOfOrg();
  const { data: teamRes, isLoading: isTeamLoading } = useTeamsByUser();

  const isLoading =
    isPending ||
    isPendingLifecycles ||
    isLoadingUserInfo ||
    isCustomFieldPending ||
    isPendingContactLabels ||
    isStaffLoading ||
    isTeamLoading;

  const hasUserData = hasUserPayload(data);
  const userQueryData = hasUserData ? data : null;
  const resolvedUserInfo = userQueryData ?? storedUserInfo;
  const resolvedUserData = resolvedUserInfo?.data ?? null;
  const missingOrgId = Boolean(userQueryData?.data?.email && !userQueryData?.data?.orgId);

  const userInfoErrorMessage = getUserInfoErrorMessage(data, error);

  const isCorruptedSession = !isLoading && isFetched && !userQueryData?.data;

  const signupRedirect = getSignupRedirect({
    hasUserData,
    missingOrgId,
    userInfoErrorMessage,
  });

  const isInbox = pathname?.includes("/dashboard/inbox");
  const isTicketsBoard = pathname?.includes("/dashboard/tickets") && Boolean(search?.b);
  const paddingExclusion =
    isInbox || isTicketsBoard
      ? true
      : pathname?.includes("/dashboard/whatsapp/flows/v2/") ||
        pathname?.includes("/dashboard/whatsapp/flowbots/") ||
        pathname?.includes("/dashboard/instagram/flowbots/");

  // Only the inbox's Channel filter needs these, and the query is shared and
  // cached forever — so it costs nothing on the pages that already fetched it.
  const { data: waSettings } = useWaSettings(Boolean(isInbox));
  const channels = useMemo(
    () => getChannelOptions(waSettings, { platform: "all", usePhoneNumber: true }),
    [waSettings],
  );

  const { data: inboxCount } = useGetInboxUserCount(Boolean(isInbox));
  const setSectionCounts = useChatContactCountStore((state) => state.setSectionCounts);

  useEffect(() => {
    if (inboxCount) {
      setSectionCounts({
        openCount: inboxCount.open,
        closedCount: inboxCount.closed,
        allCount: inboxCount.total,
        newCount: inboxCount.new ?? 0,
        // NB: the API spells this count "favourite" while the filter param and the
        // DB column are "favorite". Not a typo.
        favouriteCount: inboxCount.favourite ?? 0,
        mentionsCount: inboxCount.mentions ?? 0,
        mineCount: inboxCount.mine ?? 0,
        spamCount: inboxCount.spam ?? 0,
      });
    }
  }, [inboxCount, setSectionCounts]);

  useEffect(() => {
    if (!welcomeMessage || welcomeRefetchDone.current) {
      return;
    }

    welcomeRefetchDone.current = true;
    refetch();
  }, [refetch, welcomeMessage]);

  useEffect(() => {
    if (hasUserData) {
      setStoredUserInfo(data);
    }
  }, [data, hasUserData, setStoredUserInfo]);

  useEffect(() => {
    if (welcomeMessage || !signupRedirect) {
      return;
    }

    if (userInfoErrorMessage) {
      console.error(userInfoErrorMessage);
    }

    void navigate({
      ...signupRedirect,
      replace: true,
    });
  }, [navigate, signupRedirect, userInfoErrorMessage, welcomeMessage]);

  useEffect(() => {
    setUser(resolvedUserData);
  }, [resolvedUserData, setUser]);

  useEffect(() => {
    if (resolvedUserData?.isOrgPaused) {
      void navigate({
        to: "/login/callback/paused",
        search: { pausedby: "rateup" },
        replace: true,
      });

      return;
    }

    if (resolvedUserData?.isPaused) {
      void navigate({
        to: `/login/callback/paused?pausedby=${resolvedUserData.pausedBy}`,
        replace: true,
      });

      return;
    }

    const shopifySetUpFinishRoute = getStoredRedirect("shopify-auth-callback");
    if (shopifySetUpFinishRoute) {
      void navigate({
        to: shopifySetUpFinishRoute,
        replace: true,
      });

      return;
    }

    const shopifySubscriptionReturn = getStoredRedirect("shopify-subscription-callback");
    if (shopifySubscriptionReturn) {
      void navigate({
        to: shopifySubscriptionReturn,
        replace: true,
      });
    }
  }, [navigate, resolvedUserData]);

  return {
    channels,
    contactLabels,
    conversationTags,
    customFieldData,
    isCorruptedSession,
    isLoading,
    lifecycles,
    paddingExclusion,
    pathname,
    resolvedUserInfo,
    staff: userRes?.data ?? [],
    subscription: sub,
    teams: teamRes?.data ?? [],
  };
}
