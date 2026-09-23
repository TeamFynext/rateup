import { IconLogout, IconMenu2, IconMoon, IconSearch, IconSun } from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";

import { isStaffMock } from "@/api/auth.api";
import { useLogout, useStaff } from "@/api/auth.query";
import { useTheme } from "@/components/theme/theme-provider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { RateUpStar, Wordmark } from "./brand";
import { activeGroup, isItemActive, NAV_GROUPS } from "./nav";
import { StaffAvatar } from "./rail";

const APP_ENV = import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE;

/** The four-point star that marks the active page, as in the reference. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-3.5", className)}>
      <path
        fill="currentColor"
        d="M12 1.5c.4 5.6 4.9 10.1 10.5 10.5-5.6.4-10.1 4.9-10.5 10.5-.4-5.6-4.9-10.1-10.5-10.5C7.1 11.6 11.6 7.1 12 1.5Z"
      />
    </svg>
  );
}

function EnvPill() {
  const isProd = APP_ENV === "production";
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        isProd ? "bg-negative/10 text-negative" : "bg-muted text-muted-foreground",
      )}
    >
      {isStaffMock ? `${APP_ENV} · mock` : APP_ENV}
    </span>
  );
}

export function TopBar({ onSearch }: { onSearch: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const group = activeGroup(pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex flex-wrap items-center gap-x-8 gap-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Menu"
          onClick={() => setMenuOpen(true)}
          className="-ml-1 flex size-10 items-center justify-center rounded-xl hover:bg-muted md:hidden"
        >
          <IconMenu2 className="size-5" />
        </button>
        <Wordmark />
        <EnvPill />
      </div>

      <nav
        aria-label={group.title}
        className="order-3 -mx-1 flex w-full items-center gap-7 overflow-x-auto px-1 scrollbar-none md:order-2 md:ml-auto md:w-auto md:gap-10"
      >
        {group.items.map((item) => {
          const active = isItemActive(pathname, item.to as string);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex shrink-0 items-center gap-2 text-[13px] tracking-[0.04em] whitespace-nowrap uppercase transition-colors",
                active
                  ? "font-semibold text-foreground"
                  : "font-medium text-foreground/60 hover:text-foreground",
              )}
            >
              {active && <Sparkle />}
              {item.title}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        aria-label="Search"
        onClick={onSearch}
        className="order-2 ml-auto flex size-10 items-center justify-center rounded-xl hover:bg-muted md:hidden"
      >
        <IconSearch className="size-5" />
      </button>

      <MobileNav open={menuOpen} onOpenChange={setMenuOpen} pathname={pathname} />
    </header>
  );
}

/**
 * Below md the rail is hidden; this sheet is the rail for phones. It holds the same four
 * sections (the section's pages are the top bar's links, as on desktop), plus the theme
 * switch and the account, which the rail carries at its foot.
 */
function MobileNav({
  open,
  onOpenChange,
  pathname,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
}) {
  const current = activeGroup(pathname);
  const staff = useStaff();
  const logout = useLogout();
  const { theme, setTheme } = useTheme();
  const isDark =
    theme === "dark" ||
    (theme === "system" && globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches);

  const row =
    "flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-[15px] transition-colors [&_svg]:size-5";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex w-72 flex-col gap-0 bg-rail p-0 text-rail-foreground"
      >
        <SheetHeader className="px-6 pt-6 pb-6">
          <SheetTitle className="flex items-center gap-2.5 text-rail-foreground">
            <RateUpStar className="size-6" />
            <span className="flex items-baseline gap-2">
              <span className="text-xl font-semibold tracking-tight">RateUp</span>
              <span className="text-sm font-medium text-rail-foreground/50">Admin</span>
            </span>
          </SheetTitle>
        </SheetHeader>

        <nav aria-label="Sections" className="flex flex-col gap-1 px-4">
          {NAV_GROUPS.map((group) => {
            const active = group.id === current.id;
            return (
              <Link
                key={group.id}
                to={group.items[0].to}
                onClick={() => onOpenChange(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  row,
                  active
                    ? "bg-rail-foreground font-medium text-rail"
                    : "text-rail-foreground/75 hover:bg-rail-foreground/10",
                )}
              >
                <group.icon />
                {group.title}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-rail-foreground/10 px-4 pt-4 pb-6">
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn(row, "text-rail-foreground/75 hover:bg-rail-foreground/10")}
          >
            {isDark ? <IconSun /> : <IconMoon />}
            {isDark ? "Light mode" : "Dark mode"}
          </button>
          <div className="flex items-center gap-3 px-3 py-3">
            <StaffAvatar className="size-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{staff.name || staff.email}</p>
              <p className="truncate text-xs text-rail-foreground/50">{staff.email}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
            className={cn(row, "text-rail-foreground/75 hover:bg-rail-foreground/10")}
          >
            <IconLogout />
            Sign out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
