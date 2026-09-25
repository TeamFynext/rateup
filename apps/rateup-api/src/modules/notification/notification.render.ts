import type { NotificationEvent } from "./notification.catalogue.js";
import type { NotificationDataByEvent } from "./notify.js";

export interface RenderedNotification {
  title: string;
  body: string;
  /** App path the notification opens, e.g. `/dashboard/inbox?contactId=…`. */
  path: string;
  /** Label for the email's button. */
  action: string;
}

type Renderers = {
  [E in NotificationEvent]: (data: NotificationDataByEvent[E]) => RenderedNotification;
};

const inboxPath = (contactId: string, tab = "mine") =>
  `/dashboard/inbox?tab=${tab}&contactId=${encodeURIComponent(contactId)}`;

const by = (name?: string) => (name ? ` by ${name}` : "");

/**
 * English copy for push, email and the desktop fallback. The web app renders the bell and
 * toasts from its own translated strings (`notificationCopy.ts`), keyed by the same events.
 */
const RENDERERS: Renderers = {
  "inbox.message.assigned": (d) => ({
    title: d.contactName,
    body: `New message from ${d.contactName}`,
    path: inboxPath(d.contactId),
    action: "Open chat",
  }),
  "inbox.message.unassigned": (d) => ({
    title: "New unassigned message",
    body: `New message from ${d.contactName}`,
    path: inboxPath(d.contactId, "open"),
    action: "Open chat",
  }),
  "inbox.assigned": (d) => ({
    title: "Conversation assigned to you",
    body: `${d.contactName} was assigned to you${by(d.byName)}.`,
    path: inboxPath(d.contactId),
    action: "Open chat",
  }),
  "inbox.unassigned": (d) => ({
    title: "Conversation reassigned",
    body: `${d.contactName} was reassigned away from you${by(d.byName)}.`,
    path: inboxPath(d.contactId, "open"),
    action: "Open chat",
  }),
  "inbox.mentioned": (d) => ({
    title: "You were mentioned",
    body: d.byName
      ? `${d.byName} mentioned you in ${d.contactName}'s conversation.`
      : `You were mentioned in ${d.contactName}'s conversation.`,
    path: inboxPath(d.contactId),
    action: "Open chat",
  }),
  "inbox.closed": (d) => ({
    title: "Conversation closed",
    body: `${d.contactName}'s conversation was closed${by(d.byName)}.`,
    path: inboxPath(d.contactId, "closed"),
    action: "Open chat",
  }),
  "inbox.handover": (d) => ({
    title: "Customer needs a person",
    body: `The AI agent handed ${d.contactName}'s conversation to your team.`,
    path: inboxPath(d.contactId),
    action: "Open chat",
  }),
  "pipeline.lead_assigned": (d) => ({
    title: "Lead assigned to you",
    body: `${d.leadName} was assigned to you.`,
    path: `/dashboard/pipeline?p=${encodeURIComponent(d.pipelineId)}`,
    action: "Open pipeline",
  }),
  "pipeline.task_assigned": (d) => ({
    title: "Task assigned to you",
    body: `"${d.taskTitle}" on ${d.leadName} was assigned to you.`,
    path: `/dashboard/pipeline?p=${encodeURIComponent(d.pipelineId)}`,
    action: "Open pipeline",
  }),
  "campaign.completed": (d) => ({
    title: "Campaign completed",
    body: `${d.campaignName} has finished sending. Its delivery numbers are ready.`,
    path: `/dashboard/campaign/${d.campaignId}`,
    action: "View campaign",
  }),
  "campaign.failed": (d) => ({
    title: "Campaign failed",
    body: `${d.campaignName} could not be sent. ${d.reason}`,
    path: `/dashboard/campaign/${d.campaignId}`,
    action: "View campaign",
  }),
  "campaign.paused": (d) => ({
    title: "Campaign paused",
    body: `${d.campaignName} was paused: ${d.reason}`,
    path: `/dashboard/campaign/${d.campaignId}`,
    action: "View campaign",
  }),
  "loyalty.approval_requested": (d) => ({
    title: "Approval needed",
    body: `${d.customerName} has a loyalty request waiting for approval.`,
    path: "/dashboard/loyalty/approvals",
    action: "Review request",
  }),
  "loyalty.feedback_negative": (d) => ({
    title: "Unhappy customer feedback",
    body:
      d.rating === undefined
        ? `${d.customerName} said their visit did not go well.`
        : `${d.customerName} rated their visit ${d.rating}.`,
    path: "/dashboard/loyalty/feedback",
    action: "View feedback",
  }),
  "whatsapp.template_status": (d) => ({
    title: `Template ${d.status.toLowerCase()}`,
    body: `Meta marked the WhatsApp template "${d.templateName}" as ${d.status.toLowerCase()}.`,
    path: `/dashboard/whatsapp/templates/${d.templateId}`,
    action: "View template",
  }),
  "whatsapp.account_restricted": (d) => ({
    title: "WhatsApp account restricted",
    body: `Meta restricted ${d.channelName}. It is disconnected and cannot send messages until the restriction is lifted.`,
    path: "/dashboard/settings/channels",
    action: "Open channels",
  }),
  "integration.error": (d) => ({
    title: `${d.integration} needs attention`,
    body: d.contactName
      ? `${d.integration} failed for ${d.contactName}: ${d.error}`
      : `${d.integration}: ${d.error}`,
    path: "/dashboard/settings/integrations",
    action: "Open integrations",
  }),
  "billing.conversation_limit": (d) => ({
    title: "Conversation limit reached",
    body: d.message,
    path: "/dashboard/settings/billing",
    action: "Open billing",
  }),
};

export function renderNotification<E extends NotificationEvent>(
  event: E,
  data: NotificationDataByEvent[E],
): RenderedNotification {
  return (RENDERERS[event] as (d: NotificationDataByEvent[E]) => RenderedNotification)(data);
}
