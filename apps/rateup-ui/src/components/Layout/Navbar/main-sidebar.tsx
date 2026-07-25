import type { CSSProperties, ReactNode } from "react";

import { RouteAccessGuard } from "@/components/common/RouteAccessGuard.tsx";
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

const WebSocketHandler = () => {
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
    customFieldData,
    isCorruptedSession,
    isLoading,
    lifecycles,
    paddingExclusion,
    pathname,
    resolvedUserInfo,
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
                lifecycles={lifecycles}
                userData={resolvedUserInfo ?? undefined}
                staff={staff}
                teams={teams}
              />
            )}

            <div className="flex h-dvh w-full overflow-hidden">
              <div
                className={`min-w-0 flex-1 ${paddingExclusion ? "" : "p-4"} overflow-hidden overflow-y-auto bg-ink-25 dark:bg-[#121212] relative`}
              >
                <LifecycleContext value={lifecycles || []}>
                  <CustomFieldsProvider initialFields={customFieldData || []}>
                    <RouteAccessGuard>{children}</RouteAccessGuard>
                  </CustomFieldsProvider>
                </LifecycleContext>
              </div>

              <PhonePreviewPanel />
            </div>
          </SidebarProvider>
        </PhonePreviewProvider>
      </TeamFeaturesProvider>
    </>
  );
}
