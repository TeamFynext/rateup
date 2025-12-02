"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  IUserInfoApiResponse,
  UserAvailabilityStatus,
} from "@/backend/user/user.api";
import NotificationBellIcon from "@/components/Layout/Notification";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useChatFilterStore } from "@/components/whatsapp/inbox/chatselect/chatFilter";
import { useUser } from "@/context/UserContext";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

import { useNavMain } from "./hooks";
import { NavUser } from "./user-nav";
import { WhatsAppSettingsModal } from "./utils";

// Icon config for sidebar icons
const sidebarIconProps = {
  className: "size-5!",
  strokeWidth: 1.7,
};

export default function AppSidebar({
  subscription,
  lifecycles,
  contactLabels,
  userData,
  staff,
  teams,
}: Readonly<{
  subscription?: any;
  lifecycles?: any[];
  contactLabels?: any[];
  userData?: IUserInfoApiResponse;
  staff: any[];
  teams: any[];
}>) {
  const hiddenModules =
    process.env.NEXT_PUBLIC_HIDDEN_MODULES?.split(",") || [];

  const t = useTranslations();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const fullPathname = pathname + (searchString ? "?" + searchString : "");
  const chatFilterStore = useChatFilterStore();
  const [whatsAppModalOpened, setWhatsAppModalOpened] = useState(false);
  const [intendedRoute, setIntendedRoute] = useState<string | null>(null);
  const { setOpen, open } = useSidebar();
  const isCollapsed = !open;
  // Handlers for label/lifecycle filters

  // Unified route guard function
  const handleRouteGuard = (route?: string) => {
    // Show offline toast, but do not block navigation
    if (
      userData?.data?.status === UserAvailabilityStatus.offline &&
      userData?.data?.presenceMode !== "automatic"
    ) {
      toast.warning("You are currently offline. Please switch to online.");
    }
    // WhatsApp settings check for WhatsApp routes
    if (route?.startsWith("/dashboard/whatsapp")) {
      if (userData?.message !== "Success") return false;
      const hasWhatsAppSettings = userData?.data?.hasWhatsAppSettings || false;
      if (!hasWhatsAppSettings) {
        setWhatsAppModalOpened(true);
        setIntendedRoute(route);
        return false;
      }
    }
    return true;
  };
  const { user } = useUser();
  function handleFilter(label, value) {
    switch (label) {
      case "label":
        let updatedLabels = chatFilterStore.filter.labels?.includes(value)
          ? chatFilterStore.filter.labels?.filter((l) => l !== value)
          : [...chatFilterStore.filter.labels, value];
        chatFilterStore.setFilter({
          ...chatFilterStore.filter,
          labels: updatedLabels,
        });
        break;
      case "lifecycle":
        let updatedLifecycle =
          chatFilterStore.filter.lifecycle === value ? "" : value;
        chatFilterStore.setFilter({
          ...chatFilterStore.filter,
          lifecycle: updatedLifecycle,
        });
        break;
      case "assignedStaff":
        let updatedStaff = chatFilterStore.filter.assignedUserIds.includes(
          value,
        )
          ? chatFilterStore.filter.assignedUserIds.filter((t) => t !== value)
          : [...chatFilterStore.filter.assignedUserIds, value];
        chatFilterStore.setFilter({
          ...chatFilterStore.filter,
          assignedUserIds: updatedStaff,
        });
        break;
      case "assignedTeams":
        let updatedTeams = chatFilterStore.filter.assignedTeams.includes(value)
          ? chatFilterStore.filter.assignedTeams.filter((t) => t !== value)
          : [...chatFilterStore.filter.assignedTeams, value];
        chatFilterStore.setFilter({
          ...chatFilterStore.filter,
          assignedTeams: updatedTeams,
        });
        break;
    }
  }

  useEffect(() => {
    if (!chatFilterStore.filter.assignedUserIds) {
      chatFilterStore.setFilter({
        ...chatFilterStore.filter,
        assignedUserIds: [],
      });
    }
  }, [chatFilterStore.filter]);
  // Memoize navMain for performance
  const navMain = useNavMain({
    subscription,
    lifecycles: user?.showLifecycle ? lifecycles : [],
    contactLabels,
    staff,
    teams,
    t,
    chatFilterStore,
    hiddenModules,
    handleFilter,
  });

  // Find active item based on pathname and filters
  const [activeItem, setActiveItem] = useState(navMain[0]);
  const lastActiveTitleRef = useRef(activeItem?.title);

  useEffect(() => {
    const active = navMain.find((item) => {
      // Check children first
      const hasActiveChild = item.items?.some((subItem) => {
        const subUrl = subItem.url?.split("?")[0];
        if (subUrl && subUrl !== "#" && pathname.startsWith(subUrl))
          return true;
        if (
          subItem.items?.some((grand) => {
            const grandUrl = grand.url?.split("?")[0];
            return grandUrl && pathname.startsWith(grandUrl);
          })
        )
          return true;
        // Also check isActive for subItem
        if (subItem.isActive) return true;
        return false;
      });

      if (hasActiveChild) return true;

      // Check item itself
      if (item.url === "/dashboard" && pathname === "/dashboard") return true;
      if (
        item.url &&
        item.url !== "#" &&
        item.url !== "/dashboard" &&
        pathname.startsWith(item.url)
      )
        return true;

      return false;
    });

    // Update state if the active item has changed or any subItem isActive changed
    if (
      active &&
      (active.title !== lastActiveTitleRef.current ||
        JSON.stringify(active) !== JSON.stringify(activeItem))
    ) {
      setActiveItem(active);
      lastActiveTitleRef.current = active.title;
    }
  }, [
    pathname,
    chatFilterStore.filter?.labels,
    chatFilterStore.filter?.lifecycle,
    navMain,
    activeItem,
  ]);

  // Sidebar rendering
  return (
    <div>
      <WhatsAppSettingsModal
        opened={whatsAppModalOpened}
        onClose={() => setWhatsAppModalOpened(false)}
        intendedRoute={intendedRoute}
      />
      <div className="flex w-full h-screen">
        {/* Sidebar: Icons Only */}
        <Sidebar
          className="w-[var(--sidebar-width-icon)] border-r"
          collapsible="none"
        >
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  asChild
                  className="md:h-8 md:p-0 hidden md:flex"
                  tooltip={userData?.data?.orgName}
                >
                  <Link href="#" aria-label="Organization">
                    <Avatar
                      className={`${userData?.data.orgLogo ? "bg-background" : "bg-sidebar-primary"} text-sidebar-primary-foreground size-8 w-10 rounded-lg`}
                    >
                      <AvatarImage
                        src={getFileUrlFromKey(userData?.data.orgLogo)}
                        alt={userData?.data?.orgName}
                      />
                      <AvatarFallback className="rounded-lg uppercase bg-sidebar-primary text-sidebar-primary-foreground">
                        {userData?.data?.orgName?.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">
                        {userData?.data?.orgName}
                      </span>
                      <span className="truncate text-xs">Enterprise</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
                <SidebarTrigger className="flex md:hidden" />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navMain.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        tooltip={{
                          children: item.title,
                          hidden: false,
                        }}
                        onClick={(e) => {
                          const allow = handleRouteGuard(item.url);
                          setActiveItem(item);
                          setOpen(true);
                          if (!allow) {
                            e.preventDefault();
                          }
                        }}
                        isActive={activeItem?.title === item.title}
                        asChild={!!item.url && item.url !== "#"}
                        aria-label={item.title}
                      >
                        {item.url && item.url !== "#" ? (
                          <Link href={item.url}>
                            <item.icon {...sidebarIconProps} />
                            <span className="sr-only">{item.title}</span>
                          </Link>
                        ) : (
                          <>
                            <item.icon {...sidebarIconProps} />
                            <span className="sr-only">{item.title}</span>
                          </>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <ModeToggle />
            <NotificationBellIcon />
            <NavUser user={userData?.data} />
          </SidebarFooter>
        </Sidebar>

        {/* Sidebar: Icon + Text (Collapsible) */}
        {activeItem?.items && activeItem.items.length > 0 && (
          <Sidebar
            className="w-52 border-r relative hidden md:flex"
            collapsible="icon"
          >
            <SidebarHeader className="gap-3.5 border-b p-3 bg-background">
              <div className="flex w-full items-center justify-between">
                <h2
                  className={`flex text-foreground text-lg gap-1 font-bold ${isCollapsed ? "hidden" : ""}`}
                >
                  {activeItem.icon && (
                    <activeItem.icon
                      className={`${isCollapsed ? "hidden" : "ml-1 size-5 m-auto"}`}
                    />
                  )}
                  {activeItem?.title}
                </h2>
                <SidebarTrigger />
              </div>
            </SidebarHeader>
            <SidebarContent className="bg-background">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {activeItem.items?.map((item) =>
                      item.items && item.items.length > 0 ? (
                        <Collapsible
                          key={item.title}
                          asChild
                          defaultOpen={false}
                          className="group/collapsible"
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                tooltip={item.title}
                                variant="light"
                              >
                                {item.icon && (
                                  <item.icon {...sidebarIconProps} />
                                )}
                                <span className="font-medium">
                                  {item.title}
                                </span>
                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {item.items.map((subItem) => (
                                  <SidebarMenuSubItem key={subItem.title}>
                                    <SidebarMenuSubButton
                                      asChild
                                      onClick={(e) => {
                                        const allow = handleRouteGuard(
                                          subItem.url,
                                        );
                                        if (subItem?.handleClick)
                                          subItem.handleClick();
                                        if (!allow) {
                                          e.preventDefault();
                                        }
                                      }}
                                      isActive={
                                        subItem?.isActive ??
                                        fullPathname === subItem.url
                                      }
                                      aria-label={subItem.title}
                                      variant="light"
                                    >
                                      <Link href={subItem.url || "#"}>
                                        {subItem.icon && (
                                          <subItem.icon
                                            {...sidebarIconProps}
                                            className={`mr-2 ${sidebarIconProps.className}`}
                                            color="var(--foreground)"
                                          />
                                        )}
                                        <span className="font-medium">
                                          {subItem.title}
                                        </span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      ) : (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            tooltip={item.title}
                            isActive={fullPathname === item.url}
                            aria-label={item.title}
                            onClick={(e) => {
                              const allow = handleRouteGuard(item.url);
                              if (!allow) {
                                e.preventDefault();
                              }
                            }}
                            variant="light"
                          >
                            <Link href={item.url || "#"}>
                              {item.icon && <item.icon {...sidebarIconProps} />}
                              <span className="font-medium">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ),
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        )}
      </div>
    </div>
  );
}
