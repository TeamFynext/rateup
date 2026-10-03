import type {
  ContactRecord,
  IntegrationEvent,
} from "../integrations/events/integrationEvent.types.js";
import type { WebhookEventName } from "./webhook.schema.js";

/**
 * The contact as a webhook receiver sees it. Only these fields: the internal
 * row also carries CRM record ids and other bookkeeping that would become a
 * public contract the moment someone read it.
 */
function publicContact(contact: ContactRecord) {
  return {
    id: contact.id,
    name: contact.name ?? null,
    phone: contact.phone ?? null,
    email: contact.email ?? null,
    source: contact.source ?? null,
    lifecycleId: contact.lifecycleId ?? null,
  };
}

/**
 * The body fields for one integration event, posted as `{ event, ...fields }`
 * like `message_status`. Null for an event the webhook does not report: a lead
 * resync, which moved nothing.
 *
 * Survey responses carry ids only. The answers can be encrypted, and the
 * survey's own response webhook already sends them to the URL set on it.
 */
export function toWebhookPayload(
  event: IntegrationEvent,
): { event: WebhookEventName; payload: Record<string, unknown> } | null {
  switch (event.type) {
    case "contact.created":
    case "contact.deleted":
    case "conversation.closed":
      return { event: event.type, payload: { contact: publicContact(event.contact) } };

    case "contact.updated":
      return {
        event: event.type,
        payload: { contact: publicContact(event.contact), changed: event.changed },
      };

    case "contact.assigned":
      return {
        event: event.type,
        payload: { contact: publicContact(event.contact), assignees: event.assignees },
      };

    case "contact.lifecycle_changed":
      return {
        event: event.type,
        payload: {
          contactId: event.contactId,
          lifecycleId: event.lifecycleId,
          lifecycleName: event.lifecycleName,
        },
      };

    case "contact_group.members_added":
      return {
        event: event.type,
        payload: { contactGroupId: event.contactGroupId, contactIds: event.contactIds },
      };

    case "lead.created":
    case "lead.stage_changed": {
      if (event.type === "lead.stage_changed" && event.resync) return null;
      const { lead, stage, origin } = event;
      return {
        event: event.type,
        payload: {
          lead: {
            id: lead.id,
            contactId: lead.contactId,
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            source: lead.source,
          },
          stage: {
            id: stage.id,
            name: stage.name,
            status: stage.status,
            pipelineId: stage.pipelineId,
            pipelineName: stage.pipelineName,
            pipelineType: stage.pipelineType,
          },
          origin,
        },
      };
    }

    case "message.received": {
      const { message } = event;
      return {
        event: event.type,
        payload: {
          from: message.from,
          messageId: message.messageId ?? null,
          platform: message.sourcePlatform,
          source: message.sourceIdentifier ?? null,
          body: message.messageBody,
        },
      };
    }

    case "survey.response_submitted":
      return { event: event.type, payload: { response: event.response } };

    case "team.member_joined":
      return { event: event.type, payload: { member: event.member } };

    default:
      return null;
  }
}
