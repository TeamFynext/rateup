import { IconMenu2, IconSearch } from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";

import { isStaffMock } from "@/api/auth.api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { activeGroup, isItemActive, NAV_GROUPS } from "./nav";

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

export function Wordmark() {
  return (
    <Link to="/" className="flex items-baseline gap-2 text-foreground">
      <span className="text-[22px] font-semibold tracking-tight">RateUp</span>
      <span className="text-sm font-medium text-muted-foreground">Staff</span>
    </Link>
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
        className="-mx-1 flex max-w-full items-center gap-7 overflow-x-auto px-1 md:ml-auto md:gap-10"
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
        className="ml-auto flex size-10 items-center justify-center rounded-xl hover:bg-muted md:hidden"
      >
        <IconSearch className="size-5" />
      </button>

      <MobileNav open={menuOpen} onOpenChange={setMenuOpen} pathname={pathname} />
    </header>
  );
}

/** Below md the rail is hidden; its sections live in a sheet instead. */
function MobileNav({
  open,
  onOpenChange,
  pathname,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 bg-rail p-0 text-rail-foreground">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle className="text-lg font-semibold text-rail-foreground">
            RateUp Staff
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 overflow-y-auto px-4 pb-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="px-2 pb-2 text-[11px] font-medium tracking-wider text-rail-foreground/40 uppercase">
                {group.title}
              </p>
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                    isItemActive(pathname, item.to as string)
                      ? "bg-rail-foreground text-rail"
                      : "text-rail-foreground/70 hover:bg-rail-foreground/10",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.title}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
