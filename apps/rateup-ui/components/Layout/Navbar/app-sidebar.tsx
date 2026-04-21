"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { ChevronRight, ExternalLink, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
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
import { Separator } from "@/components/ui/separator";
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
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useChatFilterStore } from "@/components/whatsapp/inbox/chatselect/chatFilter";
import { useTeamFeatures } from "@/context/TeamFeaturesContext";
import { useUser } from "@/context/UserContext";
import { getFileUrlFromKey } from "@/utils/file-upload/upload";

import { useNavMain } from "./hooks";
import { NavUser } from "./user-nav";
import { WhatsAppSettingsModal } from "./utils";

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

/** Shared class builder for every nav item wrapper. */
function navItemClass(isActive: boolean) {
  return cn(
    "flex items-center gap-2 rounded-lg transition-all w-full px-2 h-10",
    "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:mx-auto",
    isActive
      ? "bg-primary/10 border border-primary/20 shadow-sm"
      : "hover:bg-muted/50 border border-transparent",
  );
}

/** Shared visual: icon box + label + optional chevron. Used by every nav item variant. */
function NavItemContent({
  item,
  isActive,
  showRotatingChevron,
}: Readonly<{
  item: any;
  isActive: boolean;
  showRotatingChevron?: boolean;
}>) {
  const iconClass = cn(
    "size-4",
    isActive ? "text-white" : "text-muted-foreground",
  );
  const iconBoxClass = cn(
    "rounded-md flex items-center justify-center shrink-0 size-7",
    isActive ? "bg-primary" : "bg-muted",
  );
  const labelClass = cn(
    "text-sm font-medium truncate",
    isActive ? "text-primary" : "text-foreground",
  );

  const chevron = showRotatingChevron ? (
    <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
  ) : null;
  const activeChevron =
    !showRotatingChevron && isActive ? (
      <ChevronRight className="size-4 text-primary shrink-0" />
    ) : null;

  return (
    <>
      <div className={iconBoxClass}>
        {item.icon && <item.icon className={iconClass} />}
      </div>
      <div className="flex flex-1 min-w-0 items-center group-data-[collapsible=icon]:hidden">
        <div className="flex-1 min-w-0">
          <p className={labelClass}>{item.title}</p>
          {item.description && (
            <p className="text-[11px] text-muted-foreground truncate leading-tight">
              {item.description}
            </p>
          )}
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
}: Readonly<{
  item: any;
  isActive: boolean;
  onRouteGuard: RouteGuard;
  onClick?: () => void;
}>) {
  return (
    <Link
      href={item.url || "#"}
      title={item.title}
      aria-label={item.title}
      onClick={(e) => {
        if (!onRouteGuard(item.url)) e.preventDefault();
        onClick?.();
      }}
      className={navItemClass(isActive)}
    >
      <NavItemContent item={item} isActive={isActive} />
    </Link>
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
}: Readonly<{
  item: any;
  fullPathname: string;
  onRouteGuard: RouteGuard;
  variant?: "default" | "sub" | "settings";
  sidebarComponentMap?: Record<string, React.ReactNode>;
}>) {
  if (variant === "sub") {
    const isActive = item?.isActive ?? fullPathname === item.url;
    return (
      <SidebarMenuSubItem>
        <NavLink
          item={item}
          isActive={isActive}
          onRouteGuard={onRouteGuard}
          onClick={item?.handleClick}
        />
      </SidebarMenuSubItem>
    );
  }

  if (variant === "settings") {
    const isActive = fullPathname.startsWith(item.url);
    return (
      <NavLink item={item} isActive={isActive} onRouteGuard={onRouteGuard} />
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
    return (
      <Collapsible asChild defaultOpen={false} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={item.title}
              className={navItemClass(false)}
            >
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
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  const isActive = fullPathname.startsWith(item.url);
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

  return (
    <SidebarGroup className="p-0">
      <SidebarSeparator className="m-0 group-data-[collapsible=icon]:hidden" />
      {item.showTitle && <SidebarGroupLabel>{item.group}</SidebarGroupLabel>}
      <SidebarSeparator className="m-0 hidden group-data-[collapsible=icon]:block" />
      <SidebarGroupContent className="flex p-2">
        <SidebarMenu>
          {item.items.map((groupItem: any) => (
            <NavItem
              key={groupItem.title ?? groupItem.url}
              item={groupItem}
              fullPathname={fullPathname}
              onRouteGuard={onRouteGuard}
              sidebarComponentMap={sidebarComponentMap}
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

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const fullPathname = pathname + (searchString ? "?" + searchString : "");

  const { setOpen } = useSidebar();
  const { user } = useUser();
  const { chatFilterStore, handleFilter } = useChatFilter();

  // Feature-gating: consumed from TeamFeaturesProvider (shared with RouteAccessGuard).
  // null = bypass (OWNER / ADMIN / SUPER_ADMIN), Set = restrict (MEMBER).
  const allowedFeatures = useTeamFeatures();

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
    userId: user?.userId,
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
          className="h-9 w-full"
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
          className="h-9 w-full"
        />
      ),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      chatFilterStore.filter.assignedUserIds,
      chatFilterStore.filter.assignedTeams,
      handleFilter,
    ],
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
        className="w-(--sidebar-width-icon) border-r h-screen"
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
                <Link href="#" aria-label="Organization">
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
          className="w-60 border-r relative hidden md:flex"
          collapsible="icon"
        >
          <SidebarHeader className="gap-3.5 border-b p-3 bg-background">
            <div className="flex w-full items-center justify-between">
              <h2 className="flex text-foreground text-lg gap-1 font-medium group-data-[collapsible=icon]:hidden">
                {activeItem.icon && (
                  <div className="rounded-md flex items-center justify-center shrink-0 size-7 bg-muted">
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
                          <SidebarGroupContent className="flex flex-col px-2">
                            <SidebarMenu className="gap-1">
                              <NavItem
                                item={item}
                                fullPathname={fullPathname}
                                onRouteGuard={handleRouteGuard}
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
          <SidebarRail />
        </Sidebar>
      )}
    </>
  );
}
