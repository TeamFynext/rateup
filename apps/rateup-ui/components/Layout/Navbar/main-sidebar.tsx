"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import SessionReact from "supertokens-auth-react/recipe/session";

import { useChatSocket } from "@/hooks/useChatSocket";
import { useChatContactCountStore } from "@/app/dashboard/inbox/store";
import {
  useContactLabels,
  useCustomFields,
} from "@/backend/campaign/contacts/contacts.query";
import { useLifeCyclesQuery } from "@/backend/lifecycle/lifecycle.query";
import { useTeamsMembersOfOrg } from "@/backend/org/org.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { useGetInboxUserCount } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { CustomFieldsProvider } from "@/context/CustomFieldsContext";
import { LifecycleContext } from "@/context/LifecycleContext";

import { IUserInfoApiResponse } from "../../../backend/user/user.api";
import { useUserInfo } from "../../../backend/user/user.query";
import { useUser } from "../../../context/UserContext";
import useLocalStorage from "../../../hooks/localStorage";
import NavbarSkeleton from "../../animation/skeleton/Navbar.Skeleton";
import { SidebarProvider } from "../../ui/sidebar";
import { useChatFilterStore } from "../../whatsapp/inbox/chatselect/chatFilter";
import AppSidebar from "./app-sidebar";

// WebSocketHandler Component
const WebSocketHandler = () => {
  useChatSocket();
  return null;
};

// MainContent Component
export default function MainSidebar({ children }) {
  const {
    isPending: isLoadingUserInfo,
    data: userQueryData,
    isFetched,
    refetch,
  } = useUserInfo();

  useEffect(() => {
    if (!isFetched || isLoadingUserInfo) return;

    if (
      userQueryData["data"] &&
      userQueryData["data"]?.onboardingCompleted === false
    ) {
      router.replace("/login/complete-login");
    }
  }, [userQueryData, isFetched, isLoadingUserInfo]);
  const router = useRouter();
  const query = useSearchParams() as {
    msg?: string;
    tab?: string;
  };
  const pathname = usePathname();
  const [userInfo, setUserInfo] = useLocalStorage<IUserInfoApiResponse | null>(
    "userInfo",
    null,
  );

  const { setUser } = useUser();
  const queryClient = useQueryClient();

  const { data: sub, isPending } = useSubscription();
  const { data: lifecycles, isPending: isPendingLifecycles } =
    useLifeCyclesQuery();
  const { data: customFieldData, isPending: isCustomFieldPending } =
    useCustomFields();
  const { data: contactLabels = [], isPending: isPendingContactLabels } =
    useContactLabels();
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

  if (query.msg === "welcome") {
    refetch();
  }

  useEffect(() => {
    if (userQueryData && "data" in userQueryData) {
      if (userQueryData?.data) {
        setUserInfo(userQueryData); // update localStorage
      }
      if (userQueryData?.data?.email && !userQueryData?.data?.orgId) {
        if (query?.msg !== "welcome") {
          router.push("/signup?auth=google");
        }
      }
    } else if (userQueryData && "error" in userQueryData) {
      if (userQueryData?.error?.message === "Google User missing in Rateup") {
        console.error("Google User missing in Rateup");
        if (query?.msg !== "welcome") {
          // welcome is to avoid repetition of push
          router.push("/signup?auth=google");
        }
      } else if (userQueryData?.error?.message === "User missing in Rateup") {
        console.error("User missing in Rateup");
        //TODO : handle case of email user missing signup in rateup db
      }
    }

    if (!userQueryData) {
      refetch();
    }
  }, [userQueryData]);

  useEffect(() => {
    setUser(userInfo?.data);

    if (userInfo?.data?.isOrgPaused)
      router.push(`/login/callback/paused?pausedby=rateup`);
    if (userInfo?.data?.isPaused)
      router.push(
        `/login/callback/paused?pausedby=${userInfo?.data?.pausedBy}`,
      );
    const shopifySetUpFinishRoute = localStorage.getItem(
      "shopify-auth-callback",
    );
    if (shopifySetUpFinishRoute) router.push(shopifySetUpFinishRoute);

    const shopifySubscriptionReturn = localStorage.getItem(
      "shopify-subscription-callback",
    );
    if (shopifySubscriptionReturn) router.push(shopifySubscriptionReturn);

    if (userInfo === null)
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
  }, [userInfo]);

  const { setTotalCount } = useChatContactCountStore();
  const { filter } = useChatFilterStore();
  const isInbox = pathname?.includes("/dashboard/inbox");
  const paddingExclusion = isInbox
    ? true
    : pathname?.includes("/dashboard/settings");
  const { data: inboxCount } = useGetInboxUserCount(isInbox);

  useEffect(() => {
    if (inboxCount) {
      const { assignedTeamWiseCount, ...rest } = inboxCount;
      if (filter.assignedTeams?.length) {
        setTotalCount({
          ...rest,
          assigned: assignedTeamWiseCount.reduce((count, t) => {
            count += filter.assignedTeams.includes(t.teamId)
              ? t.assignedCount
              : 0;
            return count;
          }, 0),
          assignedToMe: assignedTeamWiseCount.reduce((count, t) => {
            count += filter.assignedTeams.includes(t.teamId)
              ? t.assignedToMeCount
              : 0;
            return count;
          }, 0),
        });
      } else {
        setTotalCount(rest);
      }
    }
  }, [inboxCount, filter.assignedTeams]);

  if (!pathname) return null;

  return (
    <SessionReact.SessionAuth>
      <WebSocketHandler />

      <SidebarProvider
        defaultOpen={false}
        style={
          {
            "--sidebar-width": "0px", // for custom second sidebar width
            "--sidebar-width-icon": "53px",
          } as React.CSSProperties
        }
      >
        {isLoading ? (
          <NavbarSkeleton />
        ) : (
          <AppSidebar
            subscription={sub}
            contactLabels={contactLabels}
            lifecycles={lifecycles}
            userData={
              userQueryData &&
              "message" in userQueryData &&
              "data" in userQueryData
                ? userQueryData
                : undefined
            }
            staff={userRes?.data ?? []}
            teams={teamRes?.data ?? []}
          />
        )}

        <div
          className={`h-dvh w-full ${paddingExclusion ? "" : "p-4"} overflow-hidden overflow-y-auto bg-background`}
        >
          <LifecycleContext value={lifecycles || []}>
            <CustomFieldsProvider initialFields={customFieldData || []}>
              {children}
            </CustomFieldsProvider>
          </LifecycleContext>
        </div>
      </SidebarProvider>
    </SessionReact.SessionAuth>
  );
}
