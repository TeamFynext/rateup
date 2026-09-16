import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { MessagesPage } from "@/components/dashboard/loyalty/messages/MessagesPage.tsx";
import { MESSAGES_TABS } from "@/components/dashboard/loyalty/messages/messagesTabs.ts";
import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";

// Messages — automatic messages, keyword replies and the template library, as tabs.
const searchSchema = z.object({
  tab: z.enum(MESSAGES_TABS).optional().catch(undefined),
  // The page used to be one scroll with `?section=` anchors; old links still land.
  section: z
    .enum(["registration", "keywords", "notifications", "reminders"])
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/dashboard/loyalty/messages/")({
  validateSearch: searchSchema,
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
