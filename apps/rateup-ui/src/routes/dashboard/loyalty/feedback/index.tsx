import { createFileRoute } from "@tanstack/react-router";

import { validateFeedbackSearch } from "@/components/dashboard/loyalty/feedback/feedback.search.ts";
import { FeedbackPage } from "@/components/dashboard/loyalty/feedback/FeedbackPage.tsx";

// Feedback — the post-visit WhatsApp survey, its review reward, and what customers said.
export const Route = createFileRoute("/dashboard/loyalty/feedback/")({
  validateSearch: validateFeedbackSearch,
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  return <FeedbackPage search={search} />;
}
