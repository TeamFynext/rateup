import { axiosClient } from "../apiClient";

export enum LoyaltyEventType {
  POINTS_ISSUED = "POINTS_ISSUED",
  POINTS_ADJUSTED = "POINTS_ADJUSTED",
  REWARD_ISSUED = "REWARD_ISSUED",
  REWARD_REDEEMED = "REWARD_REDEEMED",
  TIER_UPGRADED = "TIER_UPGRADED",
  BIRTHDAY = "BIRTHDAY",
  INACTIVITY_REMINDER = "INACTIVITY_REMINDER",
  POINTS_EXPIRY_ALERT = "POINTS_EXPIRY_ALERT",
  POINTS_EXPIRED = "POINTS_EXPIRED",
  TIER_AT_RISK = "TIER_AT_RISK",
  REWARD_EXPIRING = "REWARD_EXPIRING",
  SIGNUP_ANNIVERSARY = "SIGNUP_ANNIVERSARY",
  NEW_CUSTOMER_WELCOME = "NEW_CUSTOMER_WELCOME",
}

export interface EventTrigger {
  id: string;
  programId: string;
  eventType: LoyaltyEventType;
  enabled: boolean;
  triggerDays?: number; // For INACTIVITY_REMINDER
  /** Days ahead of a dated occasion to send — set on the Reminders page. */
  leadDays?: number | null;
  /** Local hour to send at, in the programme's own timezone. */
  sendHour?: number | null;
  /** The message in words, for any channel; null takes the API catalog's default. */
  body?: string | null;
  waTemplateId?: string;
  whatsappSettingsId?: string;
  rewardId?: string;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  waTemplate?: object;
  whatsappSettings?: object;
  reward?: object;
  program?: object;
}

export interface EventTriggerInput {
  programId: string;
  eventType: LoyaltyEventType;
  enabled: boolean;
  triggerDays?: number;
  waTemplateId?: string;
  whatsappSettingsId?: string;
  rewardId?: string;
}

export interface EventTriggerUpdateInput extends Partial<EventTriggerInput> {}

const EVENT_TRIGGER_BASE = "/loyalty/settings/event-trigger";

/**
 * Get all event triggers for a program
 */
export const getEventTriggers = async (programId: string): Promise<EventTrigger[]> => {
  const response = await axiosClient.get(`${EVENT_TRIGGER_BASE}/all?programId=${programId}`);
  return response.data;
};

/**
 * Get a single event trigger by ID
 */
export const getEventTrigger = async (id: string): Promise<EventTrigger> => {
  const response = await axiosClient.get(`${EVENT_TRIGGER_BASE}/${id}`);
  return response.data;
};

/**
 * Create a new event trigger
 */
export const createEventTrigger = async (data: EventTriggerInput): Promise<EventTrigger> => {
  const response = await axiosClient.post(EVENT_TRIGGER_BASE, data);
  return response.data;
};

/**
 * Update an existing event trigger
 */
export const updateEventTrigger = async (
  id: string,
  data: EventTriggerUpdateInput,
): Promise<EventTrigger> => {
  const response = await axiosClient.put(`${EVENT_TRIGGER_BASE}/${id}`, data);
  return response.data;
};

/**
 * Delete an event trigger
 */
export const deleteEventTrigger = async (id: string): Promise<void> => {
  await axiosClient.delete(`${EVENT_TRIGGER_BASE}/${id}`);
};
