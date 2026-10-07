import {
  IconActivity,
  IconBook,
  IconCircle,
  IconCircleX,
  IconDeviceDesktop,
  IconExternalLink,
  IconLogout,
  IconMoon,
  IconSelector,
  IconSun,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";
import { startTransition, useCallback, useMemo, useOptimistic } from "react";
import { useTranslation } from "react-i18next";

import type { IUserInfoApiResponse } from "@/backend/user/user.api";
import { UserAvailabilityStatus, UserPresenceMode } from "@/backend/user/user.api";
import { userKeys } from "@/backend/user/user.keys";
import { useUpdateUserAvailabilityStatus } from "@/backend/user/user.query";
import { useTheme } from "@/components/theme/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar.tsx";
import { docsPath } from "@/utils/constants.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

type ThemeChoice = "light" | "dark" | "system";

const isThemeChoice = (value: unknown): value is ThemeChoice =>
  value === "light" || value === "dark" || value === "system";

/** Switches theme, cross-fading where the browser supports view transitions. */
function switchTheme(setTheme: (theme: ThemeChoice) => void, theme: ThemeChoice) {
  const apply = () => setTheme(theme);
  if (document.startViewTransition) document.startViewTransition(apply);
  else apply();
}

// Status options
const statusOptions: {
  value: string;
  label: string;
  icon: JSX.Element;
}[] = [
  {
    value: "automatic",
    label: "Automatic",
    icon: <IconActivity className="mr-2 h-4 w-4 text-blue-500" />,
  },
  {
    value: "online",
    label: "Available",
    icon: <IconCircle className="mr-2 h-4 w-4 text-green-500 fill-green-500" />,
  },
  {
    value: "busy",
    label: "Busy",
    icon: <IconCircle className="mr-2 h-4 w-4 text-destructive fill-red-500" />,
  },
  {
    value: "offline",
    label: "Offline",
    icon: <IconCircleX className="mr-2 h-4 w-4 text-black" />,
  },
];

// Status ring color logic
const getStatusRing = (status: UserAvailabilityStatus): string => {
  switch (status) {
    case UserAvailabilityStatus.online:
      return "ring-2 ring-green-500";
    case UserAvailabilityStatus.busy:
      return "ring-2 ring-red-500";
    case UserAvailabilityStatus.offline:
      return "ring-2 ring-foreground";
    default:
      return "ring-2 ring-blue-500";
  }
};

const getStatusOption = (presenceMode: UserPresenceMode, status: UserAvailabilityStatus) => {
  if (presenceMode === UserPresenceMode.automatic) {
    return statusOptions.find((opt) => opt.value === "automatic");
  } else {
    return statusOptions.find((opt) => opt.value === status);
  }
};

interface NavUserProps {
  user: IUserInfoApiResponse["data"] | undefined;
}

export function NavUser({ user }: Readonly<NavUserProps>) {
  const { isMobile } = useSidebar();
  const { t: translations } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [optimisticUser, addOptimisticUser] = useOptimistic<
    IUserInfoApiResponse["data"],
    {
      status: UserAvailabilityStatus;
      presenceMode: UserPresenceMode;
    }
  >(user!, (state, newStatus) => ({
    ...state,
    ...newStatus,
  }));
  const updateUserAvailabilityStatus = useUpdateUserAvailabilityStatus();

  const statusRing = useMemo(() => getStatusRing(optimisticUser.status), [optimisticUser.status]);
  const currentStatusOption = useMemo(
    () => getStatusOption(optimisticUser.presenceMode, optimisticUser.status),
    [optimisticUser.status, optimisticUser.presenceMode],
  );

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      const status =
        newStatus === "automatic"
          ? UserAvailabilityStatus.online
          : (newStatus as UserAvailabilityStatus);
      const presenceMode =
        newStatus === "automatic" ? UserPresenceMode.automatic : UserPresenceMode.manual;

      addOptimisticUser({ status, presenceMode });

      startTransition(() => {
        updateUserAvailabilityStatus.mutateAsync(
          { status, presenceMode },
          {
            onSuccess: () => {
              updateUserAvailabilityStatus.queryClient.setQueryData(
                userKeys.info(),
                (oldData: IUserInfoApiResponse | undefined) =>
                  oldData?.data
                    ? {
                        ...oldData,
                        data: {
                          ...oldData.data,
                          status,
                          presenceMode,
                        },
                      }
                    : oldData,
              );
            },
          },
        );
      });
    },
    [addOptimisticUser, updateUserAvailabilityStatus],
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton className="w-8 mx-auto data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground md:h-8 md:p-0 rounded-lg" />
            }
          >
            <Avatar className="h-8 w-8 rounded-lg text-accent-foreground">
              <AvatarImage src={getFileUrlFromKey(user?.profilePhoto ?? "")} alt={user?.userName} />
              <AvatarFallback className="rounded-lg uppercase">
                {user?.userName?.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user?.userName}</span>
              <span className="truncate text-xs">{user?.email}</span>
            </div>
            <IconSelector className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className={`h-8 w-8 rounded-lg ${statusRing}`}>
                    <AvatarImage
                      src={getFileUrlFromKey(user?.profilePhoto ?? "")}
                      alt={user?.userName}
                    />
                    <AvatarFallback className="rounded-lg uppercase">
                      {user?.userName?.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user?.userName}</span>
                    <span className="truncate text-xs">{user?.email}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.orgName} · {user?.role}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {/* Status selection submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {currentStatusOption?.icon}
                  {currentStatusOption?.label}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {statusOptions.map((opt) => {
                      const isActive =
                        (optimisticUser.presenceMode === UserPresenceMode.automatic &&
                          opt.value === "automatic") ||
                        (optimisticUser.presenceMode === UserPresenceMode.manual &&
                          optimisticUser.status === opt.value);

                      return (
                        <DropdownMenuItem
                          key={opt.value}
                          onClick={(e) => {
                            e.preventDefault();
                            handleStatusChange(opt.value);
                          }}
                          className={isActive ? "bg-accent text-accent-foreground" : ""}
                        >
                          {opt.icon}
                          {opt.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {/* Set-and-forget preferences live here rather than in the icon rail, which
                keeps its footer for what carries an unread count. */}
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <IconSun className="dark:hidden" />
                  <IconMoon className="hidden dark:block" />
                  {translations("Theme")}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={theme}
                      onValueChange={(value) => {
                        if (isThemeChoice(value)) switchTheme(setTheme, value);
                      }}
                    >
                      <DropdownMenuRadioItem value="light">
                        <IconSun />
                        {translations("Light")}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dark">
                        <IconMoon />
                        {translations("Dark")}
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="system">
                        <IconDeviceDesktop />
                        {translations("System")}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuItem render={<a href={docsPath} target="_blank" rel="noreferrer" />}>
                <IconBook />
                {translations("Help & docs")}
                <IconExternalLink className="ml-auto text-muted-foreground" />
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {/* <DropdownMenuGroup>
              <Link to="/pricing">
                <DropdownMenuItem>
                  <Sparkles />
                  Upgrade to Pro
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link to="/dashboard/settings/account">
                <DropdownMenuItem>
                  <BadgeCheck />
                  Account
                </DropdownMenuItem>
              </Link>
              <Link to="/dashboard/settings/billing">
                <DropdownMenuItem>
                  <CreditCard />
                  Billing
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator /> */}
            {/* The item renders as the link itself. Wrapped in a <Link>, the anchor was a
                separate tab stop the menu focused on open, so Enter right after opening the
                menu logged the user out. */}
            <DropdownMenuItem render={<Link to="/logout" />}>
              <IconLogout />
              {translations("Log out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
