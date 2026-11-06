import { IconLogout, IconMenu2, IconMoon, IconSearch, IconSun } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { useLogout, useStaff } from "@/api/auth.query";
import { useTheme } from "@/components/theme/theme-provider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { EnvPill, RateUpStar, Wordmark } from "./brand";
import { isItemActive, NAV_GROUPS } from "./nav";
import { StaffAvatar } from "./rail";

/** Phones only: the mark, the menu sheet and search, pinned to the top. */
export function MobileHeader({ onSearch, pathname }: { onSearch: () => void; pathname: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-md md:hidden">
      <button
        type="button"
        aria-label="Menu"
        onClick={() => setMenuOpen(true)}
        className="-ml-1.5 flex size-10 items-center justify-center rounded-lg hover:bg-muted"
      >
        <IconMenu2 className="size-5" />
      </button>
      <Wordmark />
      <EnvPill />
      <button
        type="button"
        aria-label="Search"
        onClick={onSearch}
        className="ml-auto flex size-10 items-center justify-center rounded-lg hover:bg-muted"
      >
        <IconSearch className="size-5" />
      </button>
      <MobileNav open={menuOpen} onOpenChange={setMenuOpen} pathname={pathname} />
    </header>
  );
}

/**
 * Below md the rail and nav panel are hidden; this sheet stands in for both: every section
 * with its pages, then the theme switch and the account the rail carries at its foot.
 */
export function MobileNav({
  open,
  onOpenChange,
  pathname,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
}) {
  const staff = useStaff();
  const logout = useLogout();
  const { theme, setTheme } = useTheme();
  const isDark =
    theme === "dark" ||
    (theme === "system" && globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches);

  const row =
    "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors [&_svg]:size-5";

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

        <nav aria-label="Sections" className="flex flex-col gap-4 overflow-y-auto px-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="flex flex-col gap-0.5">
              {group.items.length > 1 && (
                <p className="px-3 pb-1 text-[11px] font-medium tracking-wide text-rail-foreground/45 uppercase">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => {
                const active = isItemActive(pathname, item.to as string);
                const Icon = group.items.length > 1 ? item.icon : group.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => onOpenChange(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      row,
                      active
                        ? "bg-rail-foreground/14 font-medium text-rail-foreground"
                        : "text-rail-foreground/70 hover:bg-rail-foreground/10",
                    )}
                  >
                    <Icon />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-rail-foreground/10 px-4 pt-4 pb-6">
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn(row, "text-rail-foreground/70 hover:bg-rail-foreground/10")}
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
            className={cn(row, "text-rail-foreground/70 hover:bg-rail-foreground/10")}
          >
            <IconLogout />
            Sign out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
