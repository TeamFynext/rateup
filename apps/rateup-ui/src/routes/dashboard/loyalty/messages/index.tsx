import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { MessagesPage } from "@/components/dashboard/loyalty/messages/MessagesPage.tsx";

// Messages — registration link, keyword replies, notifications and reminders in one page.
const searchSchema = z.object({
  section: z
    .enum(["registration", "keywords", "notifications", "reminders"])
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/dashboard/loyalty/messages/")({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { section } = Route.useSearch();
  return <MessagesPage section={section} />;
}
