import { IconDeviceDesktop, IconLogout, IconMoon, IconSearch, IconSun } from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { useLogout, useStaff } from "@/api/auth.query";
import { useTheme } from "@/components/theme/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getInitials } from "@/lib/initials";
import { cn } from "@/lib/utils";

import { activeGroup, NAV_GROUPS } from "./nav";

const railButton =
  "flex size-11 items-center justify-center rounded-2xl text-rail-foreground/80 transition-colors hover:bg-rail-foreground/10 hover:text-rail-foreground [&_svg]:size-[22px]";

function RailTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children as React.ReactElement} />
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/** The ink-black icon column: search, one icon per nav group, then theme and account. */
export function Rail({ onSearch }: { onSearch: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = activeGroup(pathname);

  return (
    <nav
      aria-label="Sections"
      className="sticky top-3 hidden h-[calc(100svh-1.5rem)] w-[72px] shrink-0 flex-col items-center rounded-3xl bg-rail py-6 md:flex"
    >
      <RailTip label="Search  (Ctrl K)">
        <button type="button" className={railButton} onClick={onSearch} aria-label="Search">
          <IconSearch />
        </button>
      </RailTip>

      <div className="mt-6 flex flex-col items-center gap-2">
        {NAV_GROUPS.map((group) => {
          const active = group.id === current.id;
          return (
            <RailTip key={group.id} label={group.title}>
              <Link
                to={group.items[0].to}
                aria-label={group.title}
                aria-current={active ? "page" : undefined}
                className={cn(
                  railButton,
                  active && "bg-rail-foreground text-rail hover:bg-rail-foreground hover:text-rail",
                )}
              >
                <group.icon />
              </Link>
            </RailTip>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col items-center gap-3">
        <ThemeButton />
        <AccountMenu />
      </div>
    </nav>
  );
}

function ThemeButton() {
  const { theme, setTheme } = useTheme();
  const isDark =
    theme === "dark" ||
    (theme === "system" && globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches);

  return (
    <RailTip label={isDark ? "Light mode" : "Dark mode"}>
      <button
        type="button"
        className={railButton}
        aria-label="Toggle theme"
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        {isDark ? <IconSun /> : <IconMoon />}
      </button>
    </RailTip>
  );
}

export function StaffAvatar({ className }: { className?: string }) {
  const staff = useStaff();
  const name = staff.name || staff.email;
  return (
    <Avatar className={cn("size-10", className)}>
      {staff.avatarUrl && <AvatarImage src={staff.avatarUrl} alt="" />}
      <AvatarFallback className="bg-rail-foreground/15 text-xs font-medium text-rail-foreground">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function AccountMenu() {
  const staff = useStaff();
  const { theme, setTheme } = useTheme();
  const logout = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account"
        className="rounded-full outline-none ring-rail-foreground/40 focus-visible:ring-2"
      >
        <StaffAvatar />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" sideOffset={12} className="min-w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-2 font-normal">
            <span className="truncate text-sm font-medium text-foreground">
              {staff.name || staff.email}
            </span>
            <span className="truncate text-xs">
              {staff.email}
              {staff.isOwner && " · Owner"}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(value) => setTheme(value as typeof theme)}
          >
            <DropdownMenuRadioItem value="light">
              <IconSun />
              Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <IconMoon />
              Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <IconDeviceDesktop />
              System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={logout.isPending} onClick={() => logout.mutate()}>
          <IconLogout />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
