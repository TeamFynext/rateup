import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { meQueryOptions } from "@/api/auth.query";
import { MobileHeader } from "@/components/shell/mobile-nav";
import { activeGroup, activeItem } from "@/components/shell/nav";
import { NavPanel } from "@/components/shell/nav-panel";
import { Rail } from "@/components/shell/rail";
import { SearchPalette, useSearchHotkey } from "@/components/shell/search-palette";

/**
 * Pathless layout for every signed-in screen. The guard lives here once, so a new route under
 * `_app/` can't forget it (the mistake the old per-route `assertRootOrg` kept inviting).
 */
export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    try {
      await context.queryClient.ensureQueryData(meQueryOptions);
    } catch {
      throw redirect({ to: "/login", search: { returnTo: location.href } });
    }
  },
  component: AppLayout,
});

/** The browser tab reads the same name as the menu link: "Organisations · RateUp Admin". */
function usePageTitle(pathname: string) {
  const title = activeItem(pathname)?.title;
  useEffect(() => {
    document.title = title ? `${title} · RateUp Admin` : "RateUp Admin";
  }, [title]);
}

/** Rateup-ui's shell: navy rail, white nav panel for the section, then the page. */
function AppLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  useSearchHotkey(openSearch);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const group = activeGroup(pathname);
  usePageTitle(pathname);

  return (
    <div className="flex min-h-svh bg-background">
      <Rail onSearch={openSearch} />
      {group.panel !== "none" && <NavPanel group={group} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader onSearch={openSearch} pathname={pathname} />
        {/* Keyed on the path so each page fades in; a tab or filter only changes the search
            params, which leaves the key alone and so does not re-run the animation. */}
        <main
          key={pathname}
          className="mx-auto w-full max-w-280 flex-1 px-4 py-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200 md:px-8 md:py-8"
        >
          <Outlet />
        </main>
      </div>
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
