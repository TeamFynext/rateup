// Apart from `feedback.api.ts` so the Feedback route's search validator can read them
// without pulling the API client into the client entry.
export const FEEDBACK_REQUEST_STATUSES = [
  "SCHEDULED",
  "SENT",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
] as const;
export type FeedbackRequestStatus = (typeof FEEDBACK_REQUEST_STATUSES)[number];

export const FEEDBACK_PERIODS = ["30d", "90d", "12m"] as const;
export type FeedbackPeriod = (typeof FEEDBACK_PERIODS)[number];
