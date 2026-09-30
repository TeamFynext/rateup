import { IntegratedApps } from "../../../../types/enums.js";
import type { IntegrationEventType } from "../../events/integrationEvent.types.js";
import type { IntegrationProvider } from "../../providers/integrationProvider.types.js";
import { addZapierTriggerToQueue, ZapierTriggers } from "./zapier.service.js";

const EVENTS: readonly IntegrationEventType[] = [
  "contact.created",
  "contact.updated",
  "contact.deleted",
  "conversation.closed",
  "lead.created",
  "lead.stage_changed",
];

/**
 * Translates integration events into Zapier triggers.
 *
 * Not gated on an `Integration` row: `notifyZapier` delivers only to the hooks
 * an org subscribed, which is the same check the direct enqueues relied on.
 *
 * The payloads are the trigger contracts live Zaps are built on — the full
 * contact row, keyed by the trigger — so they must not change shape.
 */
export const zapierProvider: IntegrationProvider = {
  name: IntegratedApps.zapier,
  label: "Zapier",
  auth: "apiKey",
  connection: "self",
  events: EVENTS,
  subscribedEvents: () => EVENTS,
  // Zapier's triggers are delivered from their own queue, so there is no
  // `processJob` here.
  async handleEvent(event, { orgId }) {
    switch (event.type) {
      case "contact.created":
        return addZapierTriggerToQueue(
          ZapierTriggers.CONTACT_CREATE,
          { [ZapierTriggers.CONTACT_CREATE]: event.contact },
          orgId,
        );

      case "contact.updated":
        // A lifecycle-only bulk write never fired this trigger; Zaps would start
        // seeing an update for every contact in the batch if it did.
        if (!event.changed.includes("details") && !event.changed.includes("status")) return;
        return addZapierTriggerToQueue(
          ZapierTriggers.CONTACT_UPDATED,
          { [ZapierTriggers.CONTACT_UPDATED]: event.contact },
          orgId,
        );

      case "contact.deleted":
        return addZapierTriggerToQueue(
          ZapierTriggers.CONTACT_DELETED,
          { [ZapierTriggers.CONTACT_DELETED]: event.contact },
          orgId,
        );

      case "conversation.closed":
        return addZapierTriggerToQueue(
          ZapierTriggers.CONVERSATION_CLOSED,
          { [ZapierTriggers.CONVERSATION_CLOSED]: event.contact },
          orgId,
        );

      case "lead.created":
      case "lead.stage_changed": {
        // Keyed on the contact, like every other contact-shaped trigger: a
        // board-only lead has no contact for the Zap's later steps to look up.
        // A resync moved nothing, so there is nothing to report. An inbound
        // Zoho move still fires — a Zap should see a stage Zoho set.
        const { lead, stage } = event;
        if (!lead.contactId) return;
        if (event.type === "lead.stage_changed" && event.resync) return;

        return addZapierTriggerToQueue(
          ZapierTriggers.CONTACT_STAGE_UPDATED,
          {
            [ZapierTriggers.CONTACT_STAGE_UPDATED]: {
              contactId: lead.contactId,
              leadId: lead.id,
              pipelineId: stage.pipelineId,
              pipelineName: stage.pipelineName,
              pipelineType: stage.pipelineType,
              stageId: stage.id,
              stageName: stage.name,
              stageStatus: stage.status,
            },
          },
          orgId,
        );
      }

      default:
        return;
    }
  },
};
