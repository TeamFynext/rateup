import type { WebhookEvent } from "@/backend/webhook/webhook.api";

export type EventOption = Readonly<{ value: WebhookEvent; label: string; description: string }>;

// Labels are translation keys, passed to `t` where they render.
export const EVENT_GROUPS: Readonly<{ title: string; events: readonly EventOption[] }[]> = [
  {
    title: "Messages",
    events: [
      {
        value: "message_status",
        label: "Message Status",
        description:
          "Receive updates when a message is sent, delivered, read, or failed — including message details.",
      },
      {
        value: "message.received",
        label: "Message received",
        description: "Every inbound message, on any channel, with its content.",
      },
      {
        value: "message.status",
        label: "Message status (signed envelope)",
        description:
          "Each new sent, delivered, read or failed status for outbound WhatsApp messages, in the signed event envelope.",
      },
    ],
  },
  {
    title: "Contacts",
    events: [
      {
        value: "contact.created",
        label: "Contact created",
        description: "A contact was added, by hand, by import or from a conversation.",
      },
      {
        value: "contact.updated",
        label: "Contact updated",
        description: "A contact's details or inbox status changed.",
      },
      {
        value: "contact.deleted",
        label: "Contact deleted",
        description: "A contact was removed.",
      },
      {
        value: "contact.assigned",
        label: "Contact assigned",
        description: "Someone was newly assigned to a contact's conversation.",
      },
      {
        value: "contact.lifecycle_changed",
        label: "Lifecycle changed",
        description: "A contact was moved to a different lifecycle stage.",
      },
      {
        value: "contact_group.members_added",
        label: "Added to audience",
        description: "Contacts joined an audience.",
      },
    ],
  },
  {
    title: "Conversations",
    events: [
      {
        value: "conversation.closed",
        label: "Conversation closed",
        description: "A conversation in the inbox was closed.",
      },
    ],
  },
  {
    title: "Leads",
    events: [
      {
        value: "lead.created",
        label: "Lead created",
        description: "A lead was added to a pipeline.",
      },
      {
        value: "lead.stage_changed",
        label: "Lead stage changed",
        description: "A lead moved to another stage, including from a connected CRM.",
      },
    ],
  },
  {
    title: "Surveys & Flows",
    events: [
      {
        value: "survey.response_submitted",
        label: "Survey response submitted",
        description:
          "A survey was answered. Carries the response's ids; the answers stay in RateUp.",
      },
      {
        value: "survey.response.created",
        label: "Survey response created",
        description:
          "Any survey or WhatsApp Flow was answered, with the answers included (unless responses are encrypted).",
      },
      {
        value: "flow.response.created",
        label: "Flow response created",
        description:
          "A WhatsApp Flow was completed, with the flow's name and id and the answers. Flows are also sent as Survey response created, so pick one of the two.",
      },
    ],
  },
  {
    title: "Team",
    events: [
      {
        value: "team.member_joined",
        label: "Team member joined",
        description: "Someone accepted an invitation and joined the organisation.",
      },
    ],
  },
  {
    title: "Loyalty",
    events: [
      {
        value: "loyalty.points.earned",
        label: "Points earned",
        description: "A member earned points, from a purchase, a bonus or a referral.",
      },
      {
        value: "loyalty.points.redeemed",
        label: "Points redeemed",
        description: "A member spent points on a reward.",
      },
      {
        value: "loyalty.points.adjusted",
        label: "Points adjusted",
        description: "Points were corrected or reversed, including approved adjustments.",
      },
    ],
  },
];

/**
 * Events posted as the envelope `{ id, type, createdAt, orgId, data }` rather than the flat
 * `{ event, ...fields }` the older events use (rateup-api `ENVELOPE_WEBHOOK_EVENTS`).
 */
export const ENVELOPE_EVENTS: ReadonlySet<WebhookEvent> = new Set<WebhookEvent>([
  "message.status",
  "survey.response.created",
  "flow.response.created",
  "loyalty.points.earned",
  "loyalty.points.redeemed",
  "loyalty.points.adjusted",
]);

export const ALL_EVENT_VALUES: readonly WebhookEvent[] = EVENT_GROUPS.flatMap((g) =>
  g.events.map((e) => e.value),
);
