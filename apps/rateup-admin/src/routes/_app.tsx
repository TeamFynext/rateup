import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { meQueryOptions } from "@/api/auth.query";
import { activeItem } from "@/components/shell/nav";
import { Rail } from "@/components/shell/rail";
import { SearchPalette, useSearchHotkey } from "@/components/shell/search-palette";
import { TopBar } from "@/components/shell/top-bar";
import { cn } from "@/lib/utils";

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

function useScrolled(threshold = 4) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/** The browser tab reads the same name as the menu link: "Organisations · RateUp Admin". */
function usePageTitle() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = activeItem(pathname)?.title;
  useEffect(() => {
    document.title = title ? `${title} · RateUp Admin` : "RateUp Admin";
  }, [title]);
}

/** Full-bleed white: the rail pinned on the left, the page beside it. */
function AppLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  useSearchHotkey(openSearch);
  const scrolled = useScrolled();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  usePageTitle();

  return (
    <div className="flex min-h-svh bg-background md:p-3">
      <Rail onSearch={openSearch} />
      <div className="mx-auto flex w-full max-w-350 min-w-0 flex-1 flex-col px-4 pb-8 sm:px-6 md:px-12">
        {/* Sticky, bleeding over the column's side padding so content never shows beside it.
            The hairline only appears once the page has scrolled under it. */}
        <div
          className={cn(
            "sticky top-0 z-30 -mx-4 border-b px-4 py-4 backdrop-blur-md transition-colors sm:-mx-6 sm:px-6 md:-mx-12 md:px-12 md:py-6",
            scrolled ? "border-border bg-background/85" : "border-transparent bg-background",
          )}
        >
          <TopBar onSearch={openSearch} />
        </div>
        {/* Keyed on the path so each page fades in; a tab or filter only changes the search
            params, which leaves the key alone and so does not re-run the animation. */}
        <main
          key={pathname}
          className="mt-4 flex-1 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200 md:mt-8"
        >
          <Outlet />
        </main>
      </div>
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
