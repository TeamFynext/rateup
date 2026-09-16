import type { FeedbackFlow, FeedbackTemplate } from "@/backend/loyalty/feedback.api.ts";
import { WaFlowStatus } from "@/types/enums.ts";

/**
 * Where the feedback flow stands, in the merchant's words. Two things have to be true
 * before anything is sent — the flow published at Meta and the FLOW-button template
 * approved — so the tone folds both into one badge.
 */
export type FeedbackTone =
  | "missing"
  | "draft"
  | "pending"
  | "rejected"
  | "blocked"
  | "live"
  | "off";

export function feedbackTone(
  flow: FeedbackFlow | null | undefined,
  template: FeedbackTemplate | null | undefined,
  enabled: boolean | undefined,
): FeedbackTone {
  if (!flow) return "missing";
  switch (flow.status) {
    case WaFlowStatus.DRAFT:
      return "draft";
    case WaFlowStatus.BLOCKED:
    case WaFlowStatus.THROTTLED:
    case WaFlowStatus.DEPRECATED:
      return "blocked";
    case WaFlowStatus.PUBLISHED:
      break;
    default:
      return "pending";
  }
  // Published: the template decides the rest.
  if (!template || template.status === "pending") return "pending";
  if (template.status === "rejected") return "rejected";
  return enabled ? "live" : "off";
}

/** The sidebar chip: only the states that need chasing. */
export function feedbackNavState(
  flow: FeedbackFlow | null | undefined,
  template: FeedbackTemplate | null | undefined,
  enabled: boolean | undefined,
): "draft" | "pending" | "live" | null {
  switch (feedbackTone(flow, template, enabled)) {
    case "draft":
      return "draft";
    case "pending":
      return "pending";
    case "live":
    case "off":
      return "live";
    default:
      return null;
  }
}

/** Whether the switch may be turned on — the same rule the API enforces. */
export function canEnableFeedback(
  flow: FeedbackFlow | null | undefined,
  template: FeedbackTemplate | null | undefined,
): boolean {
  return flow?.status === WaFlowStatus.PUBLISHED && template?.status === "approved";
}
