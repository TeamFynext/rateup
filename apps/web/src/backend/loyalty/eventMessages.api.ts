import { axiosClient } from "../apiClient";
import type { LoyaltyEventType } from "./eventTriggers.api";
import type { EventTemplateResult } from "./onboarding.api";

/**
 * Messages › Automatic: the merchant's words for one event, turned into the Meta template
 * that event sends — created, edited in place, or saved as a new version when Meta will
 * not take an edit. One call, no template editor.
 */
export interface SaveEventMessageInput {
  body: string;
  enabled?: boolean;
}

export async function saveEventMessage(
  eventType: LoyaltyEventType,
  input: SaveEventMessageInput,
): Promise<EventTemplateResult> {
  return (await axiosClient.put(`/loyalty/settings/event-message/${eventType}`, input)).data;
}
