import { Link, useRouterState } from "@tanstack/react-router";

import { OrgDirectory } from "@/components/org/org-directory";
import { cn } from "@/lib/utils";

import { isItemActive, type NavGroup } from "./nav";

/** The white column beside the rail, as in rateup-ui: the section's title over its contents. */
export function NavPanel({ group }: { group: NavGroup }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      aria-label={group.title}
      className="sticky top-0 z-30 hidden h-svh w-72 shrink-0 flex-col border-r bg-sidebar md:flex"
    >
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
        <group.icon className="size-5 text-primary" stroke={1.75} />
        <h2 className="font-display text-lg font-bold tracking-[-0.015em]">{group.title}</h2>
      </div>

      {group.panel === "orgs" ? (
        <OrgDirectory className="min-h-0 flex-1" />
      ) : (
        <nav className="flex flex-col gap-0.5 overflow-y-auto p-2">
          {group.items.map((item) => {
            const active = isItemActive(pathname, item.to as string);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors [&_svg]:size-4.5",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon stroke={1.75} />
                {item.title}
              </Link>
            );
          })}
        </nav>
      )}
    </aside>
  );
}
