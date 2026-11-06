import { axiosClient } from "../apiClient";
import type { EventTrigger, LoyaltyEventType } from "./eventTriggers.api";

/**
 * Reminders: when a scheduled loyalty message sends, and to whom.
 *
 * The words are not here — they belong to the message and are saved from Messages ›
 * Automatic. Every field is optional so the page can save one control at a time; `null`
 * clears a setting, which is how "no gift" and "no chosen hour" are expressed.
 */
export interface SaveReminderInput {
  enabled?: boolean;
  /** Quiet days before the inactivity nudge. */
  triggerDays?: number | null;
  /** Days ahead of a dated occasion to send. */
  leadDays?: number | null;
  /** Local hour to send at, read in the programme's own timezone. */
  sendHour?: number | null;
  /** A gift to issue alongside the greeting. */
  rewardId?: string | null;
}

export async function saveReminder(
  eventType: LoyaltyEventType,
  input: SaveReminderInput,
): Promise<EventTrigger> {
  return (await axiosClient.put(`/loyalty/settings/reminder/${eventType}`, input)).data;
}
