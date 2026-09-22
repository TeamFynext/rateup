import {
  IconAlertTriangle,
  IconChevronRight,
  IconCircleCheck,
  IconCircle,
  IconExternalLink,
} from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { ContactLabelOption } from "@/backend/campaign/contacts/contacts.api";
import type { GetLabelsRes } from "@/backend/lifecycle/lifecycle.types";
import type { IUserInfoApiResponse } from "@/backend/user/user.api";
import { UserAvailabilityStatus } from "@/backend/user/user.api";
import type { ConversationTagOption } from "@/backend/whatsapp/inbox/conversationTag/conversationTag.api.ts";
import { UserSelector } from "@/components/Contacts/CreateContactModal.tsx";
import type { LoyaltyNavInput } from "@/components/dashboard/loyalty/loyalty.nav.ts";
import type { MetaAgentNavInput } from "@/components/dashboard/metaAgent/metaAgent.nav.ts";
import type { SetupNavInput } from "@/components/dashboard/setup/setup.nav.ts";
import type { ChannelOption } from "@/components/input/channelOptions.ts";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import type { NavEntry, NavProgress } from "@/components/Layout/Navbar/hooks.tsx";
import NotificationBellIcon from "@/components/Layout/Notification/index.tsx";
import type { PipelineNavInput } from "@/components/pipeline/pipeline.nav.tsx";
import { checkExpiry } from "@/components/Premium/ExpiryComponent.tsx";
import { ModeToggle } from "@/components/theme/ModeToggle.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
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
import { useTeamFeatures } from "@/context/TeamFeaturesContext.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { usePermissions } from "@/hooks/usePermission.ts";
import { cn } from "@/lib/utils.ts";
import { useChatFilterStore } from "@/store/chat-filter.store.ts";
import { useChatContactCountStore } from "@/store/inbox.store.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import DocsButton from "./docs-button.tsx";
import { useNavMain } from "./hooks.tsx";
import { NavUser } from "./user-nav.tsx";
import WhatsNewButton from "./whats-new/WhatsNewButton.tsx";

const sidebarIconProps = { className: "size-5!", strokeWidth: 1.75 };

/**
 * Nav counts sit in a narrow rail, so a raw 12_483 would blow the row out.
 * Anything under 1000 stays exact; past that it reads 1.2K / 3.4M.
 */
const countFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

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
      } else if (label === "conversationTag") {
        setFilter({
          ...filter,
          conversationTags: toggleList(filter.conversationTags ?? [], value),
        });
      } else if (label === "lifecycle") {
        setFilter({
          ...filter,
          lifecycle: filter.lifecycle === value ? "" : value,
        });
      } else if (label === "channel") {
        // Single choice, like lifecycle: picking the selected channel again clears
        // the scope back to every channel.
        setFilter({ ...filter, phone: filter.phone === value ? "" : value });
      } else if (label === "assignedStaff") {
        setFilter({
          ...filter,
          assignedUserIds: value === "all" ? [] : toggleList(filter.assignedUserIds, value),
        });
      } else if (label === "assignedTeams") {
        setFilter({
          ...filter,
          assignedTeams: value === "all" ? [] : toggleList(filter.assignedTeams, value),
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

interface ParsedRoute {
  path: string;
  queryString: string;
  hasQuery: boolean;
  key: string;
}

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

function isQuerySubsetMatch(current: ParsedRoute, target: ParsedRoute): boolean {
  if (!target.hasQuery) return true;

  const currentParams = new URLSearchParams(current.queryString);
  const targetParams = new URLSearchParams(target.queryString);

  for (const [key, value] of targetParams.entries()) {
    const currentValues = currentParams.getAll(key);
    if (!currentValues.includes(value)) return false;
  }

  return true;
}

function isPathPrefixActive(currentRoute: string, targetRoute?: string): boolean {
  const currentPath = parseRoute(currentRoute).path;
  const targetPath = parseRoute(targetRoute).path;

  if (!isValidRoutePath(targetPath)) return false;
  if (currentPath === targetPath) return true;

  return currentPath.startsWith(`${targetPath}/`);
}

function isExactPathActive(currentRoute: string, targetRoute?: string): boolean {
  const currentPath = parseRoute(currentRoute).path;
  const targetPath = parseRoute(targetRoute).path;

  if (!isValidRoutePath(targetPath)) return false;
  return currentPath === targetPath;
}

function getRouteMatchScore(currentRoute: string, targetRoute?: string): number {
  const current = parseRoute(currentRoute);
  const target = parseRoute(targetRoute);

  if (!isValidRoutePath(target.path)) return -1;

  if (current.key === target.key) {
    return 300000 + target.key.length;
  }

  const samePathQueryMatch =
    current.path === target.path && target.hasQuery && isQuerySubsetMatch(current, target);

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

/**
 * Between a query match and a plain prefix match: a child that claims a path under
 * its siblings' shared prefix beats them there, but never an exact or query match.
 */
function getOwnedPathScore(currentRoute: string, ownsPaths?: string[]): number {
  const { path } = parseRoute(currentRoute);
  const owned = ownsPaths?.filter((prefix) => path.startsWith(prefix)) ?? [];
  return owned.length ? 150000 + Math.max(...owned.map((prefix) => prefix.length)) : -1;
}

function getMostSpecificChildRoute(children: NavEntry[], currentRoute: string) {
  const bestMatch = children.reduce(
    (best: { routeKey: string | null; score: number }, child) => {
      const routeKey = getRouteKey(child?.url);
      const score = Math.max(
        getRouteMatchScore(currentRoute, child?.url),
        getOwnedPathScore(currentRoute, child?.ownsPaths),
      );

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
  showRotatingChevron,
}: Readonly<{
  item: NavEntry;
  showRotatingChevron?: boolean;
}>) {
  const chevron = showRotatingChevron ? (
    <IconChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
  ) : null;

  return (
    <>
      {item.icon && <item.icon {...sidebarIconProps} />}
      <div className="flex min-w-0 flex-1 items-center gap-2 group-data-[collapsible=icon]:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className={`block truncate`}>{item.title}</span>
            {item.clearFilter && item.showClearButton && (
              <Button
                size="xs"
                className="rounded-xl"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  item.clearFilter?.();
                }}
              >
                <span className="text-[10px]">{item.clearButtonName ?? "Clear"}</span>
              </Button>
            )}
          </div>
          {item.description ? (
            <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
          ) : null}
        </div>
        {item.done != null &&
          (item.done ? (
            <IconCircleCheck className="size-4 shrink-0 text-green-600 dark:text-green-500" />
          ) : (
            <IconCircle className="size-4 shrink-0 text-muted-foreground/40" />
          ))}
        {item.count != null && item.count > 0 && (
          <Badge variant="secondary" className="ml-auto tabular-nums" title={String(item.count)}>
            {countFormatter.format(item.count)}
          </Badge>
        )}
        {item.badge && (
          <Badge
            variant="secondary"
            className={cn(
              "ml-auto",
              item.badgeTone === "success" && "bg-green-600/10 text-green-700 dark:text-green-500",
              item.badgeTone === "warning" &&
                "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500",
            )}
          >
            {item.badge}
          </Badge>
        )}
        {chevron}
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
}: Readonly<{
  item: NavEntry;
  isActive: boolean;
  onRouteGuard: RouteGuard;
  onClick?: () => void;
}>) {
  return (
    <SidebarMenuButton
      isActive={isActive}
      tooltip={item.title}
      className={item.description ? "h-11 py-2" : undefined}
      render={
        <Link
          to={item.url || "#"}
          resetScroll={item.resetScroll}
          title={item.title}
          aria-label={item.title}
          onClick={(e) => {
            if (!onRouteGuard(item.url)) e.preventDefault();
            onClick?.();
            item.handleClick?.();
          }}
        />
      }
    >
      <NavItemContent item={item} />
    </SidebarMenuButton>
  );
}

/**
 * NavItem – single nav item in one of two variants:
 *   "default" → collapsible (when item.items exists), embedded component, or plain link
 *   "sub"     → leaf item inside a SidebarMenuSub
 */
function NavItem({
  item,
  fullPathname,
  onRouteGuard,
  variant = "default",
  sidebarComponentMap,
  activeSubPath,
}: Readonly<{
  item: NavEntry;
  fullPathname: string;
  onRouteGuard: RouteGuard;
  variant?: "default" | "sub";
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
        <SidebarMenuSubButton
          isActive={isActive}
          render={
            item.url === "#" || !item.url ? (
              <button
                aria-label={item.title}
                className="w-full"
                onClick={(e) => {
                  if (!onRouteGuard(item.url)) e.preventDefault();
                  item?.handleClick?.();
                }}
              />
            ) : (
              <Link
                to={item.url}
                title={item.title}
                aria-label={item.title}
                onClick={(e) => {
                  if (!onRouteGuard(item.url)) e.preventDefault();
                  item?.handleClick?.();
                }}
              />
            )
          }
        >
          {item.icon && <item.icon {...sidebarIconProps} />}
          <span>{item.title}</span>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  // variant === "default"
  if (item.type === "component") {
    const Component = item.componentKey ? sidebarComponentMap?.[item.componentKey] : undefined;
    // An unmapped key (or a caller that forgot to pass the map) used to render as
    // a bare separator with nothing above it — fail visibly nowhere instead.
    if (!Component) return null;
    return (
      <SidebarMenuItem className={item.className}>
        <div className="flex flex-col gap-2">
          {item.hasSepeartorOnTop && <SidebarSeparator className="m-0" />}
          {Component}
          {item.hasSeperatorOnBottom && <SidebarSeparator className="m-0" />}
        </div>
      </SidebarMenuItem>
    );
  }

  if ((item.items?.length ?? 0) > 0 && item.items) {
    const activeChildPath = getMostSpecificChildRoute(item.items, fullPathname);

    return (
      <Collapsible defaultOpen={false} className="group/collapsible" render={<SidebarMenuItem />}>
        <CollapsibleTrigger render={<SidebarMenuButton tooltip={item.title} />}>
          <NavItemContent item={item} showRotatingChevron />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items.map((subItem) => (
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
 * A section's "x of y" meter, pinned under its panel. The panel sits on
 * `--sidebar`, which is brand navy here, so it restates its own background the way
 * `SidebarHeader` and `SidebarContent` do.
 */
function NavPanelProgress({ progress }: Readonly<{ progress: NavProgress }>) {
  const { label, done, total } = progress;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <SidebarFooter className="gap-2 border-t bg-background group-data-[collapsible=icon]:hidden">
      <div className="flex items-baseline justify-between text-[12.5px]">
        <span className="text-secondary-foreground">{label}</span>
        <span className="text-muted-foreground">
          {done}/{total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-in-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </SidebarFooter>
  );
}

/**
 * NavSection – a labelled group of nav items: a heading over a flat list, with a
 * rule separating it from the section above. Every panel that has sections —
 * Settings, Pipeline, Get started, the inbox's filters — renders through this.
 */
function NavSection({
  item,
  fullPathname,
  onRouteGuard,
  sidebarComponentMap,
  dividedAbove,
}: Readonly<{
  item: NavEntry;
  fullPathname: string;
  onRouteGuard: RouteGuard;
  sidebarComponentMap?: Record<string, React.ReactNode>;
  /** Draw the rule that separates this section from whatever is above it. */
  dividedAbove?: boolean;
}>) {
  const groupItems = item.items ?? [];
  const activeChildPath = getMostSpecificChildRoute(groupItems, fullPathname);

  return (
    <SidebarGroup className="p-0">
      {dividedAbove && <SidebarSeparator className="m-0 mb-1" />}
      {item.group && (
        <SidebarGroupLabel className="mb-1 px-2 text-[11px] font-medium tracking-wide uppercase group-data-[collapsible=icon]:hidden">
          {item.group}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent className="flex flex-col px-2 pb-2">
        <SidebarMenu className="gap-1">
          {groupItems.map((groupItem) => (
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
    </SidebarGroup>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * A panel child that holds rows rather than being one. Section-ness comes from the
 * shape, not from having a heading — the inbox's filters are a section with no
 * label, and a click-only row that owns children marks itself with `url: "#"`.
 */
function isNavSection(item?: NavEntry): boolean {
  return Boolean(item && (item.items?.length ?? 0) > 0 && !item.url);
}

function isGrandchildActive(subItem: NavEntry, pathname: string): boolean {
  return (
    subItem.items?.some((grand) => {
      return isPathPrefixActive(pathname, grand.url);
    }) ?? false
  );
}

function isNavItemActive(item: NavEntry, pathname: string): boolean {
  // Only the URL decides which section owns the route. A child's `isActive` is a
  // selection flag ("this filter/tab is the one showing"), not a route match —
  // and some of them are persisted, so honouring it here pinned a section open
  // on every other page.
  const hasActiveChild = item.items?.some(
    (subItem) => isPathPrefixActive(pathname, subItem.url) || isGrandchildActive(subItem, pathname),
  );

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
  conversationTags,
  channels = [],
  userData,
  staff,
  teams,
  pipelineNav,
  setupNav,
  loyaltyNav,
  metaAgentNav,
}: Readonly<{
  subscription?: Subscription;
  lifecycles?: GetLabelsRes[];
  contactLabels?: ContactLabelOption[];
  conversationTags?: ConversationTagOption[];
  channels?: ChannelOption[];
  userData?: IUserInfoApiResponse;
  staff: Array<{ id: string; name?: string }>;
  teams: Array<{ id: string; name?: string; color?: string }>;
  pipelineNav: PipelineNavInput;
  setupNav: SetupNavInput;
  loyaltyNav?: LoyaltyNavInput;
  metaAgentNav: MetaAgentNavInput;
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

  // Module gating: consumed from TeamFeaturesProvider (shared with RouteAccessGuard).
  // null = every module (org-wide roles), Set = the modules the role's permissions open.
  const { allowedFeatures } = useTeamFeatures();
  const { can } = usePermissions();

  const isSubscriptionExpired = Boolean(
    subscription?.expiresAt && checkExpiry(subscription.expiresAt),
  );

  // The WhatsApp section used to be gated here on `hasWhatsAppSettings`, blocking
  // the click and putting a "WhatsApp Account Required" dialog in its place. The
  // pages behind it already read as unconnected on their own — Flows disables
  // Create and shows its empty state — so the section is reachable before a
  // channel is connected and this only reports presence.
  const handleRouteGuard = useCallback<RouteGuard>(() => {
    if (
      userData?.data?.status === UserAvailabilityStatus.offline &&
      userData?.data?.presenceMode !== "automatic"
    ) {
      toast.warning("You are currently offline. Please switch to online.");
    }

    return true;
  }, [userData]);

  const navMain = useNavMain({
    subscription,
    lifecycles: user?.showLifecycle ? lifecycles : [],
    contactLabels,
    conversationTags,
    channels,
    staff,
    teams,
    chatFilterStore,
    hiddenModules,
    handleFilter,
    allowedFeatures,
    can,
    user,
    sectionCounts: useChatContactCountStore().sectionCounts,
    pipelineNav,
    setupNav,
    loyaltyNav,
    metaAgentNav,
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
      return;
    }

    // An entry can disappear while it is open — "Get started" drops out of the
    // rail the moment setup is finished — which would otherwise leave its panel
    // on screen with nothing in the rail to match it. `navMain` is rebuilt on
    // every render, so this compares titles: falling back on object identity
    // would re-set state forever.
    const fallback = navMain[0];
    if (
      activeItem &&
      fallback &&
      fallback.title !== activeItem.title &&
      !navMain.some((item) => item.title === activeItem.title)
    ) {
      setActiveItem(fallback);
      lastActiveTitleRef.current = fallback.title;
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
          onChange={(value: string | string[], isAll?: boolean) =>
            // "All Staff" reports every user id; only the flag matters here.
            handleFilter("assignedStaff", isAll || Array.isArray(value) ? "all" : value)
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

    [chatFilterStore.filter.assignedUserIds, chatFilterStore.filter.assignedTeams, handleFilter],
  );

  const activePanelItemPath = useMemo(
    () => getMostSpecificChildRoute(activeItem?.items ?? [], fullPathname),
    [activeItem?.items, fullPathname],
  );

  return (
    <>
      {/* Icon rail */}
      {/* The rail sits on brand navy, so it carries its own copy of the sidebar
          palette rather than the panel's: icons rest at 55% white and the active
          one gets a soft white pill, per the design. Inheriting the panel's
          pale-blue active state would be unreadable here. */}
      <Sidebar
        className="w-fit border-r h-screen z-50 [--sidebar-foreground:rgba(255,255,255,0.55)] [--sidebar-accent:rgba(255,255,255,0.14)] [--sidebar-accent-foreground:#fff] [--sidebar-border:rgba(255,255,255,0.08)]"
        collapsible="none"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="md:h-8 md:p-0 hidden md:flex ml-0.5 hover:bg-transparent"
                tooltip={userData?.data?.orgName}
                render={<div aria-label="Organization" />}
              >
                <Avatar
                  className={`${userData?.data.orgLogo ? "bg-background" : "bg-sidebar-primary"} text-sidebar-primary-foreground`}
                >
                  <AvatarImage
                    src={getFileUrlFromKey(userData?.data.orgLogo ?? "")}
                    alt={userData?.data?.orgName}
                    className="rounded-md"
                  />
                  <AvatarFallback className="uppercase bg-sidebar-primary text-sidebar-primary-foreground">
                    {userData?.data?.orgName?.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
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
                      tooltip={{ children: item.title, hidden: false }}
                      onClick={(e) => {
                        const allow = handleRouteGuard(item.url);
                        setActiveItem(item);
                        setOpen(true);
                        if (!allow) e.preventDefault();
                      }}
                      isActive={activeItem?.title === item.title}
                      aria-label={item.title}
                      render={item.url && item.url !== "#" ? <Link to={item.url} /> : undefined}
                    >
                      {item.icon && <item.icon {...sidebarIconProps} />}
                      <span className="sr-only">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <ModeToggle />
          <DocsButton />
          <WhatsNewButton />
          <NotificationBellIcon />
          <NavUser user={userData?.data} />
        </SidebarFooter>
      </Sidebar>
      {/* Expanded nav panel */}
      {activeItem?.items && activeItem.items.length > 0 && (
        <Sidebar className="w-56 border-r relative hidden md:flex" collapsible="icon">
          <SidebarHeader className="h-14 justify-center border-b bg-background p-0 px-3 group-data-[collapsible=icon]:px-2">
            <div className="flex w-full items-center justify-between group-data-[collapsible=icon]:justify-center">
              <h2 className="flex text-foreground text-lg gap-1 font-bold group-data-[collapsible=icon]:hidden">
                {activeItem.icon && (
                  <div className="rounded-md flex items-center justify-center shrink-0 size-7">
                    <activeItem.icon {...sidebarIconProps} />
                  </div>
                )}
                {activeItem?.title}
              </h2>
              <SidebarTrigger />
            </div>
          </SidebarHeader>

          <SidebarContent className="bg-background pt-1">
            <SidebarGroup className="p-0">
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {activeItem.items?.map((item, index, siblings) => {
                    // A panel child is a section when it holds rows rather than
                    // being one: it has `items` and no route of its own. Its
                    // `group` is only the heading, so a section can go unlabelled.
                    const isSection = isNavSection(item);
                    // One rule per boundary, always drawn by the lower neighbour —
                    // drawing one on each side doubled it up in between, and again
                    // in the collapsed rail. A boundary is where a section starts,
                    // or where loose rows resume after one (Pipeline settings, the
                    // inbox's Settings). Consecutive loose rows stay unbroken.
                    const dividedAbove =
                      index > 0 && (isSection || isNavSection(siblings[index - 1]));

                    return isSection ? (
                      <NavSection
                        key={item.group ?? item.title ?? index}
                        item={item}
                        fullPathname={fullPathname}
                        onRouteGuard={handleRouteGuard}
                        sidebarComponentMap={sidebarComponentMap}
                        dividedAbove={dividedAbove}
                      />
                    ) : (
                      <SidebarGroup key={item.title ?? item.url} className="p-0">
                        {dividedAbove && <SidebarSeparator className="m-0 mb-1" />}
                        <SidebarGroupContent className="flex flex-col px-2">
                          <SidebarMenu className="gap-1">
                            <NavItem
                              item={item}
                              fullPathname={fullPathname}
                              onRouteGuard={handleRouteGuard}
                              sidebarComponentMap={sidebarComponentMap}
                              activeSubPath={activePanelItemPath}
                            />
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </SidebarGroup>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {activeItem?.progress && <NavPanelProgress progress={activeItem.progress} />}

          {isSubscriptionExpired && (
            <SidebarFooter className="flex-col gap-2 group-data-[collapsible=icon]:hidden">
              <Alert variant="destructive" className="px-3 py-2">
                <IconAlertTriangle className="size-4" />
                <AlertTitle className="text-xs">Subscription expired</AlertTitle>
                <AlertDescription className="text-xs">
                  Please renew from{" "}
                  <Link to="/dashboard/settings/billing" className="flex gap-1">
                    Billing <IconExternalLink className="size-3.5" />
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
