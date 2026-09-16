import { z } from "zod";

import {
  FEEDBACK_PERIODS,
  FEEDBACK_REQUEST_STATUSES,
  type FeedbackRequestsQuery,
} from "@/backend/loyalty/feedback.api.ts";

import { FEEDBACK_TABS } from "./feedbackTabs.ts";

export const FEEDBACK_PAGE_SIZE = 20;

/** Every part of the page's state lives in the URL, so a results view can be shared. */
export const feedbackSearchSchema = z.object({
  tab: z.enum(FEEDBACK_TABS).optional().catch(undefined),
  period: z.enum(FEEDBACK_PERIODS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  status: z.enum(FEEDBACK_REQUEST_STATUSES).optional().catch(undefined),
});
export type FeedbackSearch = z.infer<typeof feedbackSearchSchema>;

/** The `/requests` query for a search, in the shape the API takes. */
export function requestsQueryFor(search: FeedbackSearch): FeedbackRequestsQuery {
  return {
    page: search.page,
    pageSize: FEEDBACK_PAGE_SIZE,
    ...(search.status ? { status: search.status } : {}),
  };
}
