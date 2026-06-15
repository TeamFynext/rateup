"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, ExternalLink, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import type { IUserInfoApiResponse } from "@/backend/user/user.api";
import { UserAvailabilityStatus } from "@/backend/user/user.api";
import { UserSelector } from "@/components/Contacts/CreateContactModal.tsx";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import NotificationBellIcon from "@/components/Layout/Notification/index.tsx";
import { checkExpiry } from "@/components/Premium/ExpiryComponent.tsx";
import { ModeToggle } from "@/components/theme/ModeToggle.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import { Separator } from "@/components/ui/separator.tsx";
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
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar.tsx";
import { useChatFilterStore } from "@/components/whatsapp/inbox/chatselect/chatFilter/index.tsx";
import { useTeamFeatures } from "@/context/TeamFeaturesContext.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import { useNavMain } from "./hooks.tsx";
import { NavUser } from "./user-nav.tsx";
import { WhatsAppSettingsModal } from "./utils.tsx";

const sidebarIconProps = { className: "size-5!", strokeWidth: 1.7 };

// ---------------------------------------------------------------------------
// Custom hook – chat filter logic
// ---------------------------------------------------------------------------
function toggleList(arr: string[], value: string) {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

function useChatFilter() {
  const chatFilterStore = useChatFilterStore();

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
      if (label === "label") {
        setFilter({ ...filter, labels: toggleList(filter.labels, value) });
      } else if (label === "lifecycle") {
        setFilter({
          ...filter,
          lifecycle: filter.lifecycle === value ? "" : value,
        });
      } else if (label === "assignedStaff") {
        setFilter({
          ...filter,
          assignedUserIds:
            value === "all" ? [] : toggleList(filter.assignedUserIds, value),
        });
      } else if (label === "assignedTeams") {
        setFilter({
          ...filter,
          assignedTeams:
            value === "all" ? [] : toggleList(filter.assignedTeams, value),
        });
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

type ParsedRoute = {
  path: string;
  queryString: string;
  hasQuery: boolean;
  key: string;
};

function parseRoute(route?: string): ParsedRoute {
  const safeRoute = route?.trim() ?? "";

  if (!safeRoute) {
    return {
      path: "",
      queryString: "",
      hasQuery: false,
      key: "",
    };
  }

  const [rawPath, rawQuery = ""] = safeRoute.split("?");
  const path = rawPath.replace(/\/$/, "") || "/";

  const params = new URLSearchParams(rawQuery);
  params.sort();
  const queryString = params.toString();
  const key = queryString ? `${path}?${queryString}` : path;

  return {
    path,
    queryString,
    hasQuery: Boolean(queryString),
    key,
  };
}

function getRouteKey(route?: string): string {
  return parseRoute(route).key;
}

function isValidRoutePath(path: string): boolean {
  return Boolean(path) && path !== "#";
}

function isQuerySubsetMatch(
  current: ParsedRoute,
  target: ParsedRoute,
): boolean {
  if (!target.hasQuery) return true;

  const currentParams = new URLSearchParams(current.queryString);
  const targetParams = new URLSearchParams(target.queryString);

  for (const [key, value] of targetParams.entries()) {
    const currentValues = currentParams.getAll(key);
    if (!currentValues.includes(value)) return false;
  }

  return true;
}

function isPathPrefixActive(
  currentRoute: string,
  targetRoute?: string,
): boolean {
  const currentPath = parseRoute(currentRoute).path;
  const targetPath = parseRoute(targetRoute).path;

  if (!isValidRoutePath(targetPath)) return false;
  if (currentPath === targetPath) return true;

  return currentPath.startsWith(`${targetPath}/`);
}

function isExactPathActive(
  currentRoute: string,
  targetRoute?: string,
): boolean {
  const currentPath = parseRoute(currentRoute).path;
  const targetPath = parseRoute(targetRoute).path;

  if (!isValidRoutePath(targetPath)) return false;
  return currentPath === targetPath;
}

function getRouteMatchScore(
  currentRoute: string,
  targetRoute?: string,
): number {
  const current = parseRoute(currentRoute);
  const target = parseRoute(targetRoute);

  if (!isValidRoutePath(target.path)) return -1;

  if (current.key === target.key) {
    return 300000 + target.key.length;
  }

  const samePathQueryMatch =
    current.path === target.path &&
    target.hasQuery &&
    isQuerySubsetMatch(current, target);

  if (samePathQueryMatch) {
    return 200000 + target.queryString.length;
  }

  const pathPrefixMatch =
    current.path === target.path || current.path.startsWith(`${target.path}/`);

  if (pathPrefixMatch) {
    return 100000 + target.path.length;
  }

  return -1;
}

function getMostSpecificChildRoute(children: any[], currentRoute: string) {
  const bestMatch = children.reduce(
    (best, child) => {
      const routeKey = getRouteKey(child?.url);
      const score = getRouteMatchScore(currentRoute, child?.url);

      if (!routeKey || score < 0 || score <= best.score) return best;
      return { routeKey, score };
    },
    { routeKey: null as string | null, score: -1 },
  );

  return bestMatch.routeKey;
}

/** Shared visual: icon box + label + optional chevron. Used by every nav item variant. */
function NavItemContent({
  item,
  isActive,
  showRotatingChevron,
  showDescription,
}: Readonly<{
  item: any;
  isActive: boolean;
  showRotatingChevron?: boolean;
  showDescription?: boolean;
}>) {
  const chevron = showRotatingChevron ? (
    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
  ) : null;
  const activeChevron =
    !showRotatingChevron && isActive ? (
      <ChevronRight className="ml-auto" />
    ) : null;

  return (
    <>
      {item.icon && <item.icon />}
      <div className="flex min-w-0 flex-1 items-center gap-2 group-data-[collapsible=icon]:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span
              className={`block truncate ${
                item.isSectionHeader
                  ? "text-[11px] font-bold text-muted-foreground uppercase tracking-wide"
                  : ""
              }`}
            >
              {item.title}
            </span>
            {item.clearFilter && item.showClearButton && (
              <Button
                size="xs"
                className="rounded-xl"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  item.clearFilter();
                }}
              >
                <span className="text-[10px]">
                  {item.clearButtonName ?? "Clear"}
                </span>
              </Button>
            )}
          </div>
          {showDescription && item.description ? (
            <span className="block truncate text-xs text-muted-foreground">
              {item.description}
            </span>
          ) : null}
        </div>
        {chevron}
        {activeChevron}
      </div>
    </>
  );
}

/** Shared link element reused by all NavItem variants. */
function NavLink({
  item,
  isActive,
  onRouteGuard,
  onClick,
  showDescription,
}: Readonly<{
  item: any;
  isActive: boolean;
  onRouteGuard: RouteGuard;
  onClick?: () => void;
  showDescription?: boolean;
}>) {
  return (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      tooltip={item.title}
      className={showDescription ? "h-11 py-2" : undefined}
    >
      <Link
        to={item.url || "#"}
        title={item.title}
        aria-label={item.title}
        onClick={(e) => {
          if (!onRouteGuard(item.url)) e.preventDefault();
          onClick?.();
        }}
      >
        <NavItemContent
          item={item}
          isActive={isActive}
          showDescription={showDescription}
        />
      </Link>
    </SidebarMenuButton>
  );
}

/**
 * NavItem – single nav item in one of three variants:
 *   "default"  → collapsible (when item.items exists), embedded component, or plain link
 *   "sub"      → leaf item inside a SidebarMenuSub
 *   "settings" → direct link (no SidebarMenuItem wrapper); used inside settings groups
 */
function NavItem({
  item,
  fullPathname,
  onRouteGuard,
  variant = "default",
  sidebarComponentMap,
  activeSubPath,
}: Readonly<{
  item: any;
  fullPathname: string;
  onRouteGuard: RouteGuard;
  variant?: "default" | "sub" | "settings";
  sidebarComponentMap?: Record<string, React.ReactNode>;
  activeSubPath?: string | null;
}>) {
  if (variant === "sub") {
    const isActive =
      item?.isActive ??
      (activeSubPath
        ? getRouteKey(item.url) === activeSubPath
        : isPathPrefixActive(fullPathname, item.url));
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton asChild isActive={isActive}>
          {item.url === "#" || !item.url ? (
            <button
              aria-label={item.title}
              className="w-full"
              onClick={(e) => {
                if (!onRouteGuard(item.url)) e.preventDefault();
                item?.handleClick?.();
              }}
            >
              {item.icon && <item.icon />}
              <span>{item.title}</span>
            </button>
          ) : (
            <Link
              to={item.url}
              title={item.title}
              aria-label={item.title}
              onClick={(e) => {
                if (!onRouteGuard(item.url)) e.preventDefault();
                item?.handleClick?.();
              }}
            >
              {item.icon && <item.icon />}
              <span>{item.title}</span>
            </Link>
          )}
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  if (variant === "settings") {
    const isActive = isPathPrefixActive(fullPathname, item.url);
    return (
      <NavLink
        item={item}
        isActive={isActive}
        onRouteGuard={onRouteGuard}
        showDescription
      />
    );
  }

  // variant === "default"
  if (item.type === "component") {
    const Component = sidebarComponentMap?.[item.componentKey];
    return (
      <SidebarMenuItem>
        <div className="flex flex-col gap-2">
          {item.hasSepeartorOnTop && <SidebarSeparator className="m-0" />}
          {Component}
          {item.hasSeperatorOnBottom && <SidebarSeparator className="m-0" />}
        </div>
      </SidebarMenuItem>
    );
  }

  if (item.items?.length > 0) {
    const activeChildPath = getMostSpecificChildRoute(item.items, fullPathname);

    return (
      <Collapsible asChild defaultOpen={false} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={item.title}>
              <NavItemContent
                item={item}
                isActive={false}
                showRotatingChevron
              />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.items.map((subItem: any) => (
                <NavItem
                  key={subItem.title}
                  item={subItem}
                  fullPathname={fullPathname}
                  onRouteGuard={onRouteGuard}
                  variant="sub"
                  activeSubPath={activeChildPath}
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  const isActive =
    item?.isActive ??
    (activeSubPath
      ? getRouteKey(item.url) === activeSubPath
      : isPathPrefixActive(fullPathname, item.url));
  return (
    <SidebarMenuItem>
      <NavLink item={item} isActive={isActive} onRouteGuard={onRouteGuard} />
    </SidebarMenuItem>
  );
}

/**
 * NavSection – renders a labeled group of nav items.
 * isSettingsPanel=true → settings visual style (icon-box items with descriptions).
 * Otherwise → standard group with separators.
 */
function NavSection({
  item,
  fullPathname,
  onRouteGuard,
  sidebarComponentMap,
  isLast,
  isSettingsPanel,
}: Readonly<{
  item: any;
  fullPathname: string;
  onRouteGuard: RouteGuard;
  sidebarComponentMap?: Record<string, React.ReactNode>;
  isLast?: boolean;
  isSettingsPanel?: boolean;
}>) {
  if (isSettingsPanel) {
    return (
      <SidebarGroup className="p-0">
        {item.group && (
          <SidebarGroupLabel className="px-2 mb-1 text-[11px] uppercase tracking-wide font-medium group-data-[collapsible=icon]:hidden">
            {item.group}
          </SidebarGroupLabel>
        )}
        <SidebarGroupContent className="flex flex-col gap-1 group-data-[collapsible=icon]:items-center">
          {item.items?.map((subItem: any) => (
            <NavItem
              key={subItem.url}
              item={subItem}
              fullPathname={fullPathname}
              onRouteGuard={onRouteGuard}
              variant="settings"
            />
          ))}
        </SidebarGroupContent>
        {!isLast && (
          <Separator className="mt-1.5 group-data-[collapsible=icon]:hidden" />
        )}
      </SidebarGroup>
    );
  }

  const activeChildPath = getMostSpecificChildRoute(item.items, fullPathname);

  return (
    <SidebarGroup className="p-0">
      <SidebarSeparator className="m-0 group-data-[collapsible=icon]:hidden" />
      {item.showTitle && <SidebarGroupLabel>{item.group}</SidebarGroupLabel>}
      <SidebarSeparator className="m-0 hidden group-data-[collapsible=icon]:block" />
      <SidebarGroupContent className="flex p-2">
        <SidebarMenu className="group-data-[collapsible=icon]:items-center">
          {item.items.map((groupItem: any) => (
            <NavItem
              key={groupItem.title ?? groupItem.url}
              item={groupItem}
              fullPathname={fullPathname}
              onRouteGuard={onRouteGuard}
              sidebarComponentMap={sidebarComponentMap}
              activeSubPath={activeChildPath}
            />
          ))}
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
      return isPathPrefixActive(pathname, grand.url);
    }) ?? false
  );
}

function isNavItemActive(item: any, pathname: string): boolean {
  const hasActiveChild = item.items?.some((subItem: any) => {
    if (isPathPrefixActive(pathname, subItem.url)) return true;
    if (isGrandchildActive(subItem, pathname)) return true;
    return subItem.isActive ?? false;
  });

  if (hasActiveChild) return true;
  if (isExactPathActive(pathname, "/dashboard")) return true;
  if (
    item.url &&
    item.url !== "#" &&
    item.url !== "/dashboard" &&
    isPathPrefixActive(pathname, item.url)
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
  const hiddenModules = import.meta.env.VITE_HIDDEN_MODULES?.split(",") || [];

  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const fullPathname = useRouterState({
    select: (s) => s.location.href,
  });

  const { setOpen } = useSidebar();
  const { user } = useUser();
  const { chatFilterStore, handleFilter } = useChatFilter();

  // Feature-gating: consumed from TeamFeaturesProvider (shared with RouteAccessGuard).
  // null = bypass (SUPER_ADMIN), Set = restrict (MEMBER).
  const { allowedFeatures } = useTeamFeatures();

  const [whatsAppModalOpened, setWhatsAppModalOpened] = useState(false);
  const [intendedRoute, setIntendedRoute] = useState<string | null>(null);

  const isSubscriptionExpired = Boolean(
    subscription?.expiresAt && checkExpiry(subscription.expiresAt),
  );

  const handleRouteGuard = useCallback(
    (route?: string): boolean => {
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
    },
    [userData],
  );

  const navMain = useNavMain({
    subscription,
    lifecycles: user?.showLifecycle ? lifecycles : [],
    contactLabels,
    staff,
    teams,
    chatFilterStore,
    hiddenModules,
    handleFilter,
    allowedFeatures,
    user,
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

  const sidebarComponentMap = useMemo<Record<string, React.ReactNode>>(
    () => ({
      staffSelector: (
        <UserSelector
          allowAll
          value={chatFilterStore.filter.assignedUserIds[0] ?? "all"}
          className="w-full group-data-[collapsible=icon]:[&>svg]:hidden group-data-[collapsible=icon]:[&>span]:hidden"
          onChange={(value, isAll) =>
            handleFilter("assignedStaff", isAll ? "all" : value)
          }
        />
      ),
      teamSelector: (
        <TeamSelector
          enableAll
          value={chatFilterStore.filter.assignedTeams[0] ?? "all"}
          onChange={(value) => handleFilter("assignedTeams", value)}
          className="h-9 w-full group-data-[collapsible=icon]:[&>svg]:hidden group-data-[collapsible=icon]:[&>span]:hidden"
        />
      ),
    }),

    [
      chatFilterStore.filter.assignedUserIds,
      chatFilterStore.filter.assignedTeams,
      handleFilter,
    ],
  );

  const activePanelItemPath = useMemo(
    () => getMostSpecificChildRoute(activeItem?.items ?? [], fullPathname),
    [activeItem?.items, fullPathname],
  );

  return (
    <>
      <WhatsAppSettingsModal
        opened={whatsAppModalOpened}
        onClose={() => setWhatsAppModalOpened(false)}
        intendedRoute={intendedRoute}
      />
      {/* Icon rail */}
      <Sidebar
        className="w-(--sidebar-width-icon) border-r h-screen z-50"
        collapsible="none"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                asChild
                className="md:h-8 md:p-0 hidden md:flex ml-0.5"
                tooltip={userData?.data?.orgName}
              >
                <div aria-label="Organization">
                  <Avatar
                    className={`${userData?.data.orgLogo ? "bg-background" : "bg-sidebar-primary"} text-sidebar-primary-foreground`}
                  >
                    <AvatarImage
                      src={getFileUrlFromKey(userData?.data.orgLogo)}
                      alt={userData?.data?.orgName}
                      className="rounded-md"
                    />
                    <AvatarFallback className="uppercase bg-sidebar-primary text-sidebar-primary-foreground">
                      {userData?.data?.orgName?.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {userData?.data?.orgName}
                    </span>
                    <span className="truncate text-xs">Enterprise</span>
                  </div>
                </div>
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
                        <Link to={item.url}>
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
          className="w-60 border-r relative hidden md:flex"
          collapsible="icon"
        >
          <SidebarHeader className="gap-3.5 border-b bg-background p-3 group-data-[collapsible=icon]:px-2">
            <div className="flex w-full items-center justify-between group-data-[collapsible=icon]:justify-center">
              <h2 className="flex text-foreground text-lg gap-1 font-bold group-data-[collapsible=icon]:hidden">
                {activeItem.icon && (
                  <div className="rounded-md flex items-center justify-center shrink-0 size-7 text-primary">
                    <activeItem.icon className="ml-1 size-5 m-auto" />
                  </div>
                )}
                {activeItem?.title}
              </h2>
              <SidebarTrigger />
            </div>
          </SidebarHeader>

          <SidebarContent className="bg-background pt-1">
            {activeItem.settingsStyle ? (
              <div className="flex flex-col px-2 group-data-[collapsible=icon]:px-0">
                {activeItem.items?.map((item: any, index: number) => (
                  <NavSection
                    key={item.group ?? index}
                    item={item}
                    fullPathname={fullPathname}
                    onRouteGuard={handleRouteGuard}
                    isLast={index === activeItem.items.length - 1}
                    isSettingsPanel
                  />
                ))}
              </div>
            ) : (
              <SidebarGroup className="p-0">
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {activeItem.items?.map((item) =>
                      item.group ? (
                        <NavSection
                          key={item.group}
                          item={item}
                          fullPathname={fullPathname}
                          onRouteGuard={handleRouteGuard}
                          sidebarComponentMap={sidebarComponentMap}
                        />
                      ) : (
                        <SidebarGroup
                          key={item.title ?? item.url}
                          className="p-0"
                        >
                          <SidebarGroupContent className="flex flex-col px-2 group-data-[collapsible=icon]:px-0">
                            <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center">
                              <NavItem
                                item={item}
                                fullPathname={fullPathname}
                                onRouteGuard={handleRouteGuard}
                                activeSubPath={activePanelItemPath}
                              />
                            </SidebarMenu>
                          </SidebarGroupContent>
                        </SidebarGroup>
                      ),
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          {isSubscriptionExpired && (
            <SidebarFooter className="flex-col gap-2 group-data-[collapsible=icon]:hidden">
              <Alert variant="destructive" className="px-3 py-2">
                <TriangleAlert className="size-4" />
                <AlertTitle className="text-xs">
                  Subscription expired
                </AlertTitle>
                <AlertDescription className="text-xs">
                  Please renew from{" "}
                  <Link to="/dashboard/settings/billing" className="flex gap-1">
                    Billing <ExternalLink className="size-3.5" />
                  </Link>
                </AlertDescription>
              </Alert>
            </SidebarFooter>
          )}
          <SidebarRail />
        </Sidebar>
      )}
    </>
  );
}
