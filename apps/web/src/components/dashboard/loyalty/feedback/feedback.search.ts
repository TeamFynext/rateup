import type { FeedbackRequestsQuery } from "@/backend/loyalty/feedback.api.ts";
import {
  FEEDBACK_PERIODS,
  FEEDBACK_REQUEST_STATUSES,
  type FeedbackPeriod,
  type FeedbackRequestStatus,
} from "@/backend/loyalty/feedback.constants.ts";
import { oneOf, pageNumber } from "@/utils/search.ts";

import { FEEDBACK_TABS, type FeedbackTab } from "./feedbackTabs.ts";

export const FEEDBACK_PAGE_SIZE = 20;

/** Every part of the page's state lives in the URL, so a results view can be shared. */
export interface FeedbackSearch {
  tab?: FeedbackTab;
  period?: FeedbackPeriod;
  page: number;
  status?: FeedbackRequestStatus;
}

export function validateFeedbackSearch(search: Record<string, unknown>): FeedbackSearch {
  return {
    tab: oneOf(FEEDBACK_TABS, search.tab),
    period: oneOf(FEEDBACK_PERIODS, search.period),
    page: pageNumber(search.page),
    status: oneOf(FEEDBACK_REQUEST_STATUSES, search.status),
  };
}

/** The `/requests` query for a search, in the shape the API takes. */
export function requestsQueryFor(search: FeedbackSearch): FeedbackRequestsQuery {
  return {
    page: search.page,
    pageSize: FEEDBACK_PAGE_SIZE,
    ...(search.status ? { status: search.status } : {}),
  };
}
