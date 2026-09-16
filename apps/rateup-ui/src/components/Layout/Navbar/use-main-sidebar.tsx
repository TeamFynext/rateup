import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useContactLabels, useCustomFields } from "@/backend/campaign/contacts/contacts.query";
import { useLifeCyclesQuery } from "@/backend/lifecycle/lifecycle.query";
import { useLoyaltyFeedback } from "@/backend/loyalty/feedback.query";
import { useLoyaltyOnboardingState } from "@/backend/loyalty/onboarding.query";
import { useChecklist, useTeamsMembersOfOrg } from "@/backend/org/org.query";
import {
  usePipelinesQuery,
  usePipelineQuery,
  usePipelineStatsQuery,
} from "@/backend/pipeline/pipeline.query.tsx";
import { useConversationLimit } from "@/backend/stats/stats.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import type { IUserInfoApiResponse } from "@/backend/user/user.api";
import { useUserInfo } from "@/backend/user/user.query";
import { useConversationTags } from "@/backend/whatsapp/inbox/conversationTag/conversationTag.query.ts";
import { useGetInboxUserCount } from "@/backend/whatsapp/inbox/message/wamessage.query.ts";
import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { feedbackNavState } from "@/components/dashboard/loyalty/feedback/feedbackStatus.ts";
import type { LoyaltyNavInput } from "@/components/dashboard/loyalty/loyalty.nav.ts";
import { programStateOf } from "@/components/dashboard/loyalty/program/programState.ts";
import type { SetupNavInput } from "@/components/dashboard/setup/setup.nav.ts";
import { getChannelOptions } from "@/components/input/channelOptions.ts";
import type { PipelineNavInput } from "@/components/pipeline/pipeline.nav.tsx";
import { useUser } from "@/context/UserContext.tsx";
import useLocalStorage from "@/hooks/localStorage.tsx";
import { useChatContactCountStore } from "@/store/inbox.store.ts";
import { usePipelineStore } from "@/store/pipeline.store.ts";
import { SubscriptionFeaturePathName } from "@/types/enums.ts";
import { hasFeature } from "@/utils/subscription/subscription.ts";

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
  const { t } = useTranslation();
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
  const paddingExclusion = isInbox
    ? true
    : // The setup guide carries a fixed header over its own scroller.
      pathname?.includes("/dashboard/setup") ||
      pathname?.includes("/dashboard/whatsapp/flows/v2/") ||
      pathname?.includes("/dashboard/whatsapp/flowbots/") ||
      pathname?.includes("/dashboard/instagram/flowbots/");

  // Only the inbox's Channel filter needs these, and the query is shared and
  // cached forever — so it costs nothing on the pages that already fetched it.
  const { data: waSettings } = useWaSettings(Boolean(isInbox));
  const channels = useMemo(
    () => getChannelOptions(waSettings, { platform: "all", usePhoneNumber: true }),
    [waSettings],
  );

  // Same shape as the inbox counts above: the sidebar is mounted app-wide, so
  // the pipeline's leads are only fetched while the user is actually on it.
  const isPipeline = pathname?.includes("/dashboard/pipeline");
  const { data: pipelines = [] } = usePipelinesQuery(Boolean(isPipeline));
  const activePipelineId =
    (typeof search?.p === "string" ? search.p : undefined) ?? pipelines[0]?.id;
  const { data: activePipeline } = usePipelineQuery(isPipeline ? activePipelineId : undefined);
  const { data: pipelineStats } = usePipelineStatsQuery(isPipeline ? activePipelineId : undefined);

  // Gated on the pipeline for the same reason as the leads above: this query
  // refetches on every window focus, and only this panel shows the number.
  const conversationLimit = useConversationLimit(Boolean(isPipeline));

  // The board's own view state, so a sidebar row highlights what is on screen
  // and clicking one drives the same store the page reads.
  const pipelineView = usePipelineStore();

  const pipelineNav = useMemo<PipelineNavInput>(
    () => ({
      t,
      pipelines,
      pipeline: activePipeline,
      stats: pipelineStats,
      view: pipelineView,
      activePipelineId,
      currentUserId: resolvedUserData?.userId,
      setView: pipelineView.patch,
      toggleFacet: pipelineView.toggle,
      conversationLimit,
    }),
    [
      t,
      pipelines,
      activePipeline,
      pipelineStats,
      pipelineView,
      activePipelineId,
      resolvedUserData?.userId,
      conversationLimit,
    ],
  );

  // Same rule as the pipeline: the sidebar is mounted app-wide, so the loyalty state —
  // which carries the badge counts — is only fetched while the user is on a loyalty page,
  // where the pages read the same query anyway.
  const isLoyalty = Boolean(pathname?.includes("/dashboard/loyalty"));
  const { data: loyaltyState } = useLoyaltyOnboardingState(isLoyalty);
  // Same query the Feedback page reads, so the chip and the page never disagree.
  const { data: feedback } = useLoyaltyFeedback(isLoyalty);
  const loyaltyNav = useMemo<LoyaltyNavInput>(
    () => ({
      t,
      programState: loyaltyState
        ? loyaltyState.program
          ? programStateOf(loyaltyState.program)
          : null
        : null,
      members: loyaltyState?.counts.members,
      pendingApprovals: loyaltyState?.counts.pendingApprovals,
      templatesPending: loyaltyState?.counts.templatesPending,
      feedbackState: feedback
        ? feedbackNavState(feedback.flow, feedback.template, feedback.setting?.enabled)
        : null,
      pathname,
    }),
    [t, loyaltyState, feedback, pathname],
  );

  const isSetup = pathname?.includes("/dashboard/setup");

  // Once the org has finished (or dismissed) setup the guide is gone for good, so
  // the checklist is only fetched while it can still put a row in the rail.
  const setupDismissed = resolvedUserData?.onboardingChecklistCompleted ?? true;
  const { data: checklist } = useChecklist(!setupDismissed);

  const setupNav = useMemo<SetupNavInput>(
    () => ({
      t,
      checklist: checklist?.onboardingChecklist,
      dismissed: setupDismissed || Boolean(checklist?.onboardingChecklistCompleted),
      // Only WhatsApp is known here; the checklist carries the rest, which the guide
      // writes as soon as it sees a channel linked.
      connected: { whatsapp: Boolean(resolvedUserData?.hasWhatsAppSettings) },
      hasLoyaltyFeature: sub
        ? Boolean(hasFeature(sub, SubscriptionFeaturePathName.Whatsapp))
        : null,
      activeStep: isSetup && typeof search?.step === "string" ? search.step : undefined,
    }),
    [
      t,
      checklist,
      setupDismissed,
      resolvedUserData?.hasWhatsAppSettings,
      sub,
      isSetup,
      search?.step,
    ],
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
    loyaltyNav,
    paddingExclusion,
    pathname,
    pipelineNav,
    resolvedUserInfo,
    setupNav,
    staff: userRes?.data ?? [],
    subscription: sub,
    teams: teamRes?.data ?? [],
  };
}
