import { createFileRoute, redirect } from "@tanstack/react-router";

import { MessagesPage } from "@/components/dashboard/loyalty/messages/MessagesPage.tsx";
import {
  MESSAGES_TABS,
  type MessagesTab,
} from "@/components/dashboard/loyalty/messages/messagesTabs.ts";
import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";
import { oneOf } from "@/utils/search.ts";

// The page used to be one scroll with `?section=` anchors; old links still land.
const LEGACY_SECTIONS = ["registration", "keywords", "notifications", "reminders"] as const;

export const Route = createFileRoute("/dashboard/loyalty/messages/")({
  // Messages — automatic messages, keyword replies and the template library, as tabs.
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: MessagesTab; section?: (typeof LEGACY_SECTIONS)[number] } => ({
    tab: oneOf(MESSAGES_TABS, search.tab),
    section: oneOf(LEGACY_SECTIONS, search.section),
  }),
  beforeLoad: ({ search }) => {
    if (!search.section) return;
    if (search.section === "registration") {
      // The registration link and QR moved to Settings.
      throw redirect({ to: LOYALTY_PATHS.settings, replace: true });
    }
    throw redirect({
      to: LOYALTY_PATHS.messages,
      search: { tab: search.section === "keywords" ? "replies" : "automatic" },
      replace: true,
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { tab } = Route.useSearch();
  return <MessagesPage tab={tab} />;
}
