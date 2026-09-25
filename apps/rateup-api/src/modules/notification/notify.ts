import { log } from "../../utils/logger.js";
import { notificationQueue } from "../../workers/bullmq/queues/notification.queue.js";
import type { NotificationEvent } from "./notification.catalogue.js";

interface ContactRef {
  contactId: string;
  contactName: string;
}

interface CampaignRef {
  campaignId: string;
  campaignName: string;
}

/** What each event carries. It is stored on the bell row, so the UI reads the same fields. */
export interface NotificationDataByEvent {
  "inbox.message.assigned": ContactRef;
  "inbox.message.unassigned": ContactRef;
  "inbox.assigned": ContactRef & { byName?: string };
  "inbox.unassigned": ContactRef & { byName?: string };
  "inbox.mentioned": ContactRef & { byName?: string };
  "inbox.closed": ContactRef & { byName?: string };
  "inbox.handover": ContactRef;
  "pipeline.lead_assigned": { leadId: string; leadName: string; pipelineId: string };
  "pipeline.task_assigned": {
    leadId: string;
    leadName: string;
    pipelineId: string;
    taskTitle: string;
  };
  "campaign.completed": CampaignRef;
  "campaign.failed": CampaignRef & { reason: string };
  "campaign.paused": CampaignRef & { reason: string };
  "loyalty.approval_requested": { approvalId: string; customerName: string; requestType: string };
  "loyalty.feedback_negative": { customerName: string; contactId?: string; rating?: number };
  "whatsapp.template_status": { templateId: string; templateName: string; status: string };
  "whatsapp.account_restricted": { channelName: string };
  "integration.error": { integration: string; error: string; contactName?: string };
  "billing.conversation_limit": { message: string };
}

/**
 * Who an event is for, before preferences and permissions narrow it. Resolved on the worker,
 * so a webhook handler never waits on loading every member's permissions.
 */
export type NotifyAudience =
  | { kind: "users"; userIds: string[] }
  | { kind: "team"; teamId: string }
  /** Every member holding the event's permission, limited to `teamId`'s members when team-scoped. */
  | { kind: "permitted"; teamId?: string | null }
  /** Everyone who can see an unassigned conversation arriving on this channel. */
  | { kind: "inboxQueue"; sourceIdentifier: string | null };

export interface NotifyJobData<E extends NotificationEvent = NotificationEvent> {
  event: E;
  orgId: string;
  audience: NotifyAudience;
  data: NotificationDataByEvent[E];
  /** The member who caused it. They are never notified about their own action. */
  actorUserId?: string | null;
}

/**
 * Tell members about something, on whichever channels each of them chose. Best-effort: a
 * notification must never fail the action that caused it, so errors are logged, not thrown.
 */
export async function notify<E extends NotificationEvent>(input: NotifyJobData<E>): Promise<void> {
  if (input.audience.kind === "users" && input.audience.userIds.length === 0) return;
  try {
    await notificationQueue.add("notify", { notifyData: input });
  } catch (error) {
    log.error(
      { err: error, event: input.event, orgId: input.orgId },
      "Could not enqueue a notification",
    );
  }
}
