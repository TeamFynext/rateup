"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { ChevronRight, ExternalLink, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  IUserInfoApiResponse,
  UserAvailabilityStatus,
} from "@/backend/user/user.api";
import { UserSelector } from "@/components/Contacts/CreateContactModal";
import { TeamSelector } from "@/components/input/TeamSelector";
import NotificationBellIcon from "@/components/Layout/Notification";
import { checkExpiry } from "@/components/Premium/ExpiryComponent";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useChatFilterStore } from "@/components/whatsapp/inbox/chatselect/chatFilter";
import { useUser } from "@/context/UserContext";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

import { useNavMain } from "./hooks";
import { NavUser } from "./user-nav";
import { WhatsAppSettingsModal } from "./utils";

const sidebarIconProps = { className: "size-5!", strokeWidth: 1.7 };

// ---------------------------------------------------------------------------
// Custom hook – chat filter logic
// ---------------------------------------------------------------------------
function useChatFilter() {
  const chatFilterStore = useChatFilterStore();

  // Ensure assignedUserIds is always initialised
  useEffect(() => {
    if (!chatFilterStore.filter.assignedUserIds) {
      chatFilterStore.setFilter({
        ...chatFilterStore.filter,
        assignedUserIds: [],
      });
    }
  }, [chatFilterStore.filter]);

  const handleFilter = useCallback(
    (label: string, value: string) => {
      const { filter, setFilter } = chatFilterStore;
      switch (label) {
        case "label": {
          const updated = filter.labels?.includes(value)
            ? filter.labels.filter((l) => l !== value)
            : [...filter.labels, value];
          setFilter({ ...filter, labels: updated });
          break;
        }
        case "lifecycle": {
          setFilter({
            ...filter,
            lifecycle: filter.lifecycle === value ? "" : value,
          });
          break;
        }
        case "assignedStaff": {
          const existing = filter.assignedUserIds;
          let updated: string[];
          if (value === "all") {
            updated = [];
          } else if (existing.includes(value)) {
            updated = existing.filter((t) => t !== value);
          } else {
            updated = [...existing, value];
          }
          setFilter({ ...filter, assignedUserIds: updated });
          break;
        }
        case "assignedTeams": {
          const existing = filter.assignedTeams;
          let updated: string[];
          if (value === "all") {
            updated = [];
          } else if (existing.includes(value)) {
            updated = existing.filter((t) => t !== value);
          } else {
            updated = [...existing, value];
          }
          setFilter({ ...filter, assignedTeams: updated });
          break;
        }
      }
    },
    [chatFilterStore],
  );

  return { chatFilterStore, handleFilter };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
type RouteGuard = (route?: string) => boolean;

/** A single leaf-level menu sub-item. */
function NavSubItem({
  subItem,
  fullPathname,
  onRouteGuard,
}: Readonly<{
  subItem: any;
  fullPathname: string;
  onRouteGuard: RouteGuard;
}>) {
  return (
    <SidebarMenuSubItem key={subItem.title}>
      <SidebarMenuSubButton
        asChild
        onClick={(e) => {
          const allow = onRouteGuard(subItem.url);
          if (subItem?.handleClick) subItem.handleClick();
          if (!allow) e.preventDefault();
        }}
        isActive={subItem?.isActive ?? fullPathname === subItem.url}
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
          <span className="font-medium">{subItem.title}</span>
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

/** An expandable item that reveals sub-items via a Collapsible. */
function CollapsibleNavItem({
  item,
  fullPathname,
  onRouteGuard,
  onExpandCollapsed,
}: Readonly<{
  item: any;
  fullPathname: string;
  onRouteGuard: RouteGuard;
  onExpandCollapsed?: () => void;
}>) {
  return (
    <Collapsible asChild defaultOpen={false} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            variant="light"
            onClick={onExpandCollapsed}
          >
            {item.icon && <item.icon {...sidebarIconProps} />}
            <span className="font-medium">{item.title}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items?.map((subItem: any) => (
              <NavSubItem
                key={subItem.title}
                subItem={subItem}
                fullPathname={fullPathname}
                onRouteGuard={onRouteGuard}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

/** A simple link item with no children. */
function SimpleNavItem({
  item,
  fullPathname,
  onRouteGuard,
}: Readonly<{
  item: any;
  fullPathname: string;
  onRouteGuard: RouteGuard;
}>) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={item.title}
        isActive={fullPathname.startsWith(item.url)}
        aria-label={item.title}
        onClick={(e) => {
          const allow = onRouteGuard(item.url);
          if (!allow) e.preventDefault();
        }}
        variant="light"
      >
        <Link href={item.url || "#"}>
          {item.icon && <item.icon {...sidebarIconProps} />}
          <span className="font-medium">{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/** A labelled section/group inside the expanded sidebar panel. */
function GroupSection({
  item,
  isCollapsed,
  fullPathname,
  onRouteGuard,
  sidebarComponentMap,
}: Readonly<{
  item: any;
  isCollapsed: boolean;
  fullPathname: string;
  onRouteGuard: RouteGuard;
  sidebarComponentMap: Record<string, React.ReactNode>;
}>) {
  return (
    <SidebarGroup key={item.group} className="p-0">
      {!isCollapsed && <SidebarSeparator className="m-0" />}
      {item.showTitle && <SidebarGroupLabel>{item.group}</SidebarGroupLabel>}
      {isCollapsed && <SidebarSeparator className="m-0" />}
      <SidebarGroupContent className="flex p-2">
        <SidebarMenu>
          {item.items.map((groupItem: any) => {
            if (groupItem.items?.length > 0) {
              return (
                <CollapsibleNavItem
                  key={groupItem.title}
                  item={groupItem}
                  fullPathname={fullPathname}
                  onRouteGuard={onRouteGuard}
                />
              );
            }

            if (groupItem.type === "component") {
              const Component = sidebarComponentMap[groupItem.componentKey];
              return (
                <SidebarMenuItem key={groupItem.title}>
                  <div className="flex flex-col gap-2">
                    {groupItem.hasSepeartorOnTop && (
                      <SidebarSeparator className="m-0" />
                    )}
                    {Component}
                    {groupItem.hasSeperatorOnBottom && (
                      <SidebarSeparator className="m-0" />
                    )}
                  </div>
                </SidebarMenuItem>
              );
            }

            return (
              <SidebarMenuItem key={groupItem.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={groupItem.title}
                  isActive={fullPathname === groupItem.url}
                  aria-label={groupItem.title}
                  onClick={(e) => {
                    const allow = onRouteGuard(groupItem.url);
                    if (!allow) e.preventDefault();
                  }}
                  variant="light"
                >
                  <Link href={groupItem.url || "#"}>
                    {groupItem.icon && <groupItem.icon {...sidebarIconProps} />}
                    <span className="font-medium">{groupItem.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
      <SidebarSeparator className="m-0" />
    </SidebarGroup>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isGrandchildActive(subItem: any, pathname: string): boolean {
  return (
    subItem.items?.some((grand: any) => {
      const grandUrl = grand.url?.split("?")[0];
      return grandUrl && pathname.startsWith(grandUrl);
    }) ?? false
  );
}

function isNavItemActive(item: any, pathname: string): boolean {
  const hasActiveChild = item.items?.some((subItem: any) => {
    const subUrl = subItem.url?.split("?")[0];
    if (subUrl && subUrl !== "#" && pathname.startsWith(subUrl)) return true;
    if (isGrandchildActive(subItem, pathname)) return true;
    return subItem.isActive ?? false;
  });

  if (hasActiveChild) return true;
  if (item.url === "/dashboard" && pathname === "/dashboard") return true;
  if (
    item.url &&
    item.url !== "#" &&
    item.url !== "/dashboard" &&
    pathname.startsWith(item.url)
  )
    return true;
  return false;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
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

  const { setOpen, open } = useSidebar();
  const isCollapsed = !open;
  const { user } = useUser();
  const { chatFilterStore, handleFilter } = useChatFilter();

  const [whatsAppModalOpened, setWhatsAppModalOpened] = useState(false);
  const [intendedRoute, setIntendedRoute] = useState<string | null>(null);

  const isSubscriptionExpired = Boolean(
    subscription?.expiresAt && checkExpiry(subscription.expiresAt),
  );

  const handleRouteGuard = (route?: string): boolean => {
    if (
      userData?.data?.status === UserAvailabilityStatus.offline &&
      userData?.data?.presenceMode !== "automatic"
    ) {
      toast.warning("You are currently offline. Please switch to online.");
    }

    if (route?.startsWith("/dashboard/whatsapp")) {
      if (userData?.message !== "Success") return false;
      if (!userData?.data?.hasWhatsAppSettings) {
        setWhatsAppModalOpened(true);
        setIntendedRoute(route);
        return false;
      }
    }

    return true;
  };

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
    userId: user?.userId,
  });

  const [activeItem, setActiveItem] = useState(navMain[0]);
  const lastActiveTitleRef = useRef(activeItem?.title);
  const hasShownExpiredSubscriptionToast = useRef(false);

  useEffect(() => {
    if (isSubscriptionExpired && !hasShownExpiredSubscriptionToast.current) {
      toast.error("Your subscription has expired. Please renew your plan.");
      hasShownExpiredSubscriptionToast.current = true;
    }
  }, [isSubscriptionExpired]);

  useEffect(() => {
    const active = navMain.find((item) => isNavItemActive(item, pathname));

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

  const sidebarComponentMap: Record<string, React.ReactNode> = {
    staffSelector: (
      <UserSelector
        allowAll
        value={
          chatFilterStore.filter.assignedUserIds.length
            ? chatFilterStore.filter.assignedUserIds[0]
            : "all"
        }
        className="h-9 w-full border-[#1873E8]/20 hover:border-[#1873E8]/40 focus:ring-[#1873E8] focus:border-[#1873E8]"
        onChange={(value, isAll) =>
          handleFilter("assignedStaff", isAll ? "all" : value)
        }
      />
    ),
    teamSelector: (
      <TeamSelector
        enableAll
        value={
          chatFilterStore.filter.assignedTeams.length
            ? chatFilterStore.filter.assignedTeams[0]
            : "all"
        }
        onChange={(value) => handleFilter("assignedTeams", value)}
        className="h-9 w-full border-[#1873E8]/20 hover:border-[#1873E8]/40 focus:ring-[#1873E8] focus:border-[#1873E8]"
      />
    ),
  };

  return (
    <div>
      <WhatsAppSettingsModal
        opened={whatsAppModalOpened}
        onClose={() => setWhatsAppModalOpened(false)}
        intendedRoute={intendedRoute}
      />
      <div className="flex w-full h-screen">
        {/* Icon rail */}
        <Sidebar
          className="w-(--sidebar-width-icon) border-r"
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
                <SidebarMenu className="gap-2">
                  {navMain.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        tooltip={{ children: item.title, hidden: false }}
                        onClick={(e) => {
                          const allow = handleRouteGuard(item.url);
                          setActiveItem(item);
                          setOpen(true);
                          if (!allow) e.preventDefault();
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

        {/* Expanded nav panel */}
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
                      className={isCollapsed ? "hidden" : "ml-1 size-5 m-auto"}
                    />
                  )}
                  {activeItem?.title}
                </h2>
                <SidebarTrigger />
              </div>
            </SidebarHeader>

            <SidebarContent className="bg-background pt-1">
              <SidebarGroup className="p-0">
                <SidebarGroupContent>
                  <SidebarMenu className="gap-2">
                    {activeItem.items?.map((item) =>
                      item.group ? (
                        <GroupSection
                          key={item.group}
                          item={item}
                          isCollapsed={isCollapsed}
                          fullPathname={fullPathname}
                          onRouteGuard={handleRouteGuard}
                          sidebarComponentMap={sidebarComponentMap}
                        />
                      ) : (
                        <SidebarGroup
                          key={item.title ?? item.url}
                          className="p-0"
                        >
                          <SidebarGroupContent className="flex px-2">
                            <SidebarMenu>
                              {item.items?.length > 0 ? (
                                <CollapsibleNavItem
                                  item={item}
                                  fullPathname={fullPathname}
                                  onRouteGuard={handleRouteGuard}
                                />
                              ) : (
                                <SimpleNavItem
                                  item={item}
                                  fullPathname={fullPathname}
                                  onRouteGuard={handleRouteGuard}
                                />
                              )}
                            </SidebarMenu>
                          </SidebarGroupContent>
                        </SidebarGroup>
                      ),
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            {isSubscriptionExpired && !isCollapsed && (
              <SidebarFooter className="flex-col gap-2">
                <Alert variant="destructive" className="px-3 py-2">
                  <TriangleAlert className="size-4" />
                  <AlertTitle className="text-xs">
                    Subscription expired
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    Please renew from{" "}
                    <Link
                      href="/dashboard/settings/billing"
                      className="flex gap-1"
                    >
                      Billing <ExternalLink className="size-3.5" />
                    </Link>
                  </AlertDescription>
                </Alert>
              </SidebarFooter>
            )}
          </Sidebar>
        )}
      </div>
    </div>
  );
}
