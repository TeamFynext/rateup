/**
 * The trigger keys the RateUp Zapier app subscribes to. Each is a live external
 * contract: the published app's triggers name these strings, and every Zap
 * built on one expects its payload (`zapier.payloads.ts`) to keep its shape.
 */
export enum ZapierTriggers {
  CONTACT_CREATE = "new_contact_create",
  CONTACT_ASSIGN = "new_contact_assignee",
  NEW_MESSAGE = "new_message_received",
  CONVERSATION_CLOSED = "conversation_closed",
  CONTACT_UPDATED = "contact_updated",
  CONTACT_LIFECYCLE_UPDATED = "contact_lifecycle_updated",
  /**
   * A contact's lead moved to a different pipeline column — the board's
   * counterpart to {@link ZapierTriggers.CONTACT_LIFECYCLE_UPDATED}.
   *
   * Added beside it rather than replacing it: the lifecycle trigger is a live
   * external contract, and every Zap already built on it keeps firing unchanged.
   */
  CONTACT_STAGE_UPDATED = "contact_stage_updated",
  CONTACT_ADDED_TO_GROUP = "contact_added_to_group",
  RESPONSE_SUBMITTED = "response_submitted",
  CONTACT_DELETED = "contact_deleted",
  NEW_TEAM_MEMBER_CREATED = "new_staff_joined_to_team",
}

/**
 * One REST-hook subscription inside the Zapier `Integration.credential`, as the
 * app's subscribe call stores it. Zapier turns a hook off by answering 410.
 */
export interface ZapierTriggerSubscription {
  hookUrl: string;
  subscribed_field: string;
  active: boolean;
  zapId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** The subscriptions in a Zapier credential; the column is `Json`, so this is asserted once here. */
export function readZapierSubscriptions(credential: unknown): ZapierTriggerSubscription[] {
  const subscriptions = (credential as { triggerSubscriptions?: unknown } | null)
    ?.triggerSubscriptions;
  return Array.isArray(subscriptions) ? (subscriptions as ZapierTriggerSubscription[]) : [];
}

/** The hooks that should hear `trigger` right now. */
export function activeZapierHooks(credential: unknown, trigger: ZapierTriggers) {
  return readZapierSubscriptions(credential).filter(
    (subscription) => subscription.subscribed_field === trigger && subscription.active,
  );
}

/** `triggerKey` of a provider job that posts one payload to one hook. */
export const ZAPIER_DELIVERY = "zapier_delivery";

export interface ZapierDeliveryJobData {
  trigger: ZapierTriggers;
  hookUrl: string;
  payload: unknown;
}
