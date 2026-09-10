import { WaFlowStatus } from "../../../types/enums.js";
import { findOverallRatingElement } from "../../whatsapp/flows/flowTemplates.js";

/**
 * Whether a flow can be used for loyalty feedback. The reply handlers need three things to
 * be true of it — v2 dialect, alive at Meta, and a rating question carrying the Google-review
 * threshold — and the reasons are written for the person looking at the picker.
 */
export type FeedbackEligibility = { eligible: true } | { eligible: false; reason: string };

const DEAD_STATUSES: readonly string[] = [
  WaFlowStatus.DEPRECATED,
  WaFlowStatus.BLOCKED,
  WaFlowStatus.THROTTLED,
];

export function feedbackEligibility(flow: {
  json: WaFlowJson;
  version: number;
  status: string;
}): FeedbackEligibility {
  if (DEAD_STATUSES.includes(flow.status)) {
    return { eligible: false, reason: "No longer usable at Meta" };
  }
  if (flow.version !== 2) {
    return {
      eligible: false,
      reason: "Built with the old editor — create it again from a Loyalty feedback template",
    };
  }
  if (!findOverallRatingElement(flow.json)) {
    return {
      eligible: false,
      reason:
        "Its rating question no longer has a Google review threshold — create the flow again from a template",
    };
  }
  return { eligible: true };
}
