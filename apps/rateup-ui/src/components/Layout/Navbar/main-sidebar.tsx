import type { CSSProperties, ReactNode } from "react";

import { RouteAccessGuard } from "@/components/common/RouteAccessGuard.tsx";
import { PlanBanner } from "@/components/Layout/PlanBanner.tsx";
import { CustomFieldsProvider } from "@/context/CustomFieldsContext.tsx";
import { LifecycleContext } from "@/context/LifecycleContext.ts";
import { TeamFeaturesProvider } from "@/context/TeamFeaturesContext.tsx";
import { useChatSocket } from "@/hooks/useChatSocket.tsx";

import NavbarSkeleton from "../../animation/skeleton/Navbar.Skeleton";
import { PhonePreviewPanel, PhonePreviewProvider } from "../../ui/phone-preview.tsx";
import { SidebarProvider } from "../../ui/sidebar.tsx";
import AppSidebar from "./app-sidebar.tsx";
import CorruptedSessionScreen from "./corrupted-session.tsx";
import { useMainSidebar } from "./use-main-sidebar.tsx";

const WebSocketHandler = (): null => {
  useChatSocket();

  return null;
};

type MainSidebarProps = Readonly<{
  children: ReactNode;
  welcomeMessage?: boolean;
}>;

export default function MainSidebar({ children, welcomeMessage = false }: MainSidebarProps) {
  const {
    channels,
    contactLabels,
    conversationTags,
    customFieldData,
    isCorruptedSession,
    isLoading,
    lifecycles,
    paddingExclusion,
    pathname,
    pipelineNav,
    loyaltyNav,
    resolvedUserInfo,
    setupNav,
    staff,
    subscription,
    teams,
  } = useMainSidebar({ welcomeMessage });

  if (!pathname) return null;

  if (isCorruptedSession) {
    return <CorruptedSessionScreen />;
  }

  return (
    <>
      <WebSocketHandler />

      <TeamFeaturesProvider>
        <PhonePreviewProvider>
          <SidebarProvider
            defaultOpen={true}
            style={
              {
                "--sidebar-width": "0px", // for custom second sidebar width
                "--sidebar-width-icon": "53px",
              } as CSSProperties
            }
          >
            {isLoading ? (
              <NavbarSkeleton />
            ) : (
              <AppSidebar
                subscription={subscription}
                channels={channels}
                contactLabels={contactLabels}
                conversationTags={conversationTags}
                lifecycles={lifecycles}
                pipelineNav={pipelineNav}
                loyaltyNav={loyaltyNav}
                setupNav={setupNav}
                userData={resolvedUserInfo ?? undefined}
                staff={staff}
                teams={teams}
              />
            )}

            <div className="flex h-dvh w-full overflow-hidden">
              {/* A column, so the plan banner spans the full content width and stays put
                  while the page scrolls. It used to live inside the scroller below, which
                  inset it by that container's `p-4` on every route that has padding and
                  let it scroll away. */}
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <PlanBanner />

                <div
                  className={`min-h-0 flex-1 ${paddingExclusion ? "" : "p-4"} overflow-y-auto bg-background relative`}
                >
                  <LifecycleContext value={lifecycles || []}>
                    <CustomFieldsProvider initialFields={customFieldData || []}>
                      <RouteAccessGuard>{children}</RouteAccessGuard>
                    </CustomFieldsProvider>
                  </LifecycleContext>
                </div>
              </div>

              <PhonePreviewPanel />
            </div>
          </SidebarProvider>
        </PhonePreviewProvider>
      </TeamFeaturesProvider>
    </>
  );
}
