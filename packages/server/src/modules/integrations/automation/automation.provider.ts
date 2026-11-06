import prisma from "../../../utils/prisma.js";
import type { IntegrationEventType } from "../events/integrationEvent.types.js";
import { readZapierSubscriptions, ZapierTriggers } from "../external/zapier/zapier.types.js";
import type { Integration } from "../../../generated/prisma/client.js";
import type { ZapierTriggerInput } from "../external/zapier/zapier.payloads.js";
import type {
  IntegrationProvider,
  ProviderJobData,
  ProviderJobRunContext,
} from "../providers/integrationProvider.types.js";
import { deliverAutomationHook, queueAutomationTrigger } from "./automation.deliver.js";
import { automationDeliveryKey, type AutomationPlatform } from "./automation.platforms.js";

/** Which trigger each event fires. */
const TRIGGER_FOR_EVENT: Partial<Record<IntegrationEventType, ZapierTriggers>> = {
  "contact.created": ZapierTriggers.CONTACT_CREATE,
  "contact.updated": ZapierTriggers.CONTACT_UPDATED,
  "contact.deleted": ZapierTriggers.CONTACT_DELETED,
  "contact.assigned": ZapierTriggers.CONTACT_ASSIGN,
  "contact.lifecycle_changed": ZapierTriggers.CONTACT_LIFECYCLE_UPDATED,
  "contact_group.members_added": ZapierTriggers.CONTACT_ADDED_TO_GROUP,
  "conversation.closed": ZapierTriggers.CONVERSATION_CLOSED,
  "message.received": ZapierTriggers.NEW_MESSAGE,
  "team.member_joined": ZapierTriggers.NEW_TEAM_MEMBER_CREATED,
  "survey.response_submitted": ZapierTriggers.RESPONSE_SUBMITTED,
  "lead.created": ZapierTriggers.CONTACT_STAGE_UPDATED,
  "lead.stage_changed": ZapierTriggers.CONTACT_STAGE_UPDATED,
};

const EVENTS = Object.keys(TRIGGER_FOR_EVENT) as IntegrationEventType[];

/**
 * How a platform's provider queues and posts deliveries. Defaults to the shared
 * functions for that platform; Zapier passes its own named wrappers.
 */
export interface AutomationDelivery {
  queue<T extends ZapierTriggers>(
    integration: Pick<Integration, "orgId" | "credential">,
    trigger: T,
    input: ZapierTriggerInput[T],
  ): Promise<void>;
  deliver(
    integration: Integration,
    job: ProviderJobData,
    context: ProviderJobRunContext,
  ): Promise<void | "skipped">;
}

/**
 * An automation platform (Zapier, Make, …): RateUp events become the REST-hook
 * triggers the org's Zaps or scenarios subscribe to. `handleEvent` builds a
 * trigger's payload and queues one delivery per hook; `processJob` posts it.
 *
 * The payloads are the trigger contracts live Zaps are built on, so they must
 * not change shape (`zapier.payloads.ts`). Each platform's own routes (auth,
 * subscribe, actions) are an external contract too and live with the platform.
 */
export function createAutomationProvider(
  platform: AutomationPlatform,
  label: string,
  delivery: AutomationDelivery = {
    queue: (integration, trigger, input) =>
      queueAutomationTrigger(platform, integration, trigger, input),
    deliver: (integration, job, context) =>
      deliverAutomationHook(platform, integration, job, context),
  },
): IntegrationProvider {
  return {
    name: platform,
    label,
    auth: "apiKey",
    connection: "integration",
    events: EVENTS,

    // Only the events some active hook listens to, so an org whose scenarios use
    // one trigger is not handed every inbound message.
    subscribedEvents(integration) {
      const listening = new Set(
        readZapierSubscriptions(integration?.credential)
          .filter((subscription) => subscription.active)
          .map((subscription) => subscription.subscribed_field),
      );
      return EVENTS.filter((type) => listening.has(TRIGGER_FOR_EVENT[type]!));
    },

    async handleEvent(event, { integration }) {
      if (!integration) return;

      switch (event.type) {
        case "contact.created":
          return delivery.queue(integration, ZapierTriggers.CONTACT_CREATE, event.contact);

        case "contact.updated":
          // A lifecycle-only bulk write never fired this trigger; Zaps would start
          // seeing an update for every contact in the batch if it did.
          if (!event.changed.includes("details") && !event.changed.includes("status")) return;
          return delivery.queue(integration, ZapierTriggers.CONTACT_UPDATED, event.contact);

        case "contact.deleted":
          return delivery.queue(integration, ZapierTriggers.CONTACT_DELETED, event.contact);

        case "conversation.closed":
          return delivery.queue(integration, ZapierTriggers.CONVERSATION_CLOSED, event.contact);

        case "contact.assigned":
          return delivery.queue(integration, ZapierTriggers.CONTACT_ASSIGN, {
            contact: event.contact,
            newAssignees: event.assignees,
          });

        case "contact.lifecycle_changed":
          return delivery.queue(integration, ZapierTriggers.CONTACT_LIFECYCLE_UPDATED, {
            contactId: event.contactId,
            lifecycleId: event.lifecycleId,
            lifecycleName: event.lifecycleName,
          });

        case "contact_group.members_added":
          for (const contactId of event.contactIds) {
            await delivery.queue(integration, ZapierTriggers.CONTACT_ADDED_TO_GROUP, {
              contactId,
              contactGroupId: event.contactGroupId,
            });
          }
          return;

        case "message.received":
          return delivery.queue(integration, ZapierTriggers.NEW_MESSAGE, event.message);

        case "team.member_joined":
          return delivery.queue(integration, ZapierTriggers.NEW_TEAM_MEMBER_CREATED, event.member);

        case "survey.response_submitted": {
          // The event carries ids only; the Zap gets the response as it was filed.
          const response = await prisma.surveyResponse.findUnique({
            where: { id: event.response.id },
            select: {
              responses: true,
              createdAt: true,
              language: true,
              tag: true,
              platform: true,
              deviceData: true,
              contactId: true,
              location: true,
              surveyTeamMap: {
                select: {
                  survey: { select: { title: true } },
                  team: { select: { name: true } },
                },
              },
            },
          });
          if (!response) return;
          return delivery.queue(integration, ZapierTriggers.RESPONSE_SUBMITTED, response);
        }

        case "lead.created":
        case "lead.stage_changed": {
          // Keyed on the contact, like every other contact-shaped trigger: a
          // board-only lead has no contact for the Zap's later steps to look up.
          // A resync moved nothing, so there is nothing to report. An inbound
          // Zoho move still fires — a Zap should see a stage Zoho set.
          const { lead, stage } = event;
          if (!lead.contactId) return;
          if (event.type === "lead.stage_changed" && event.resync) return;

          return delivery.queue(integration, ZapierTriggers.CONTACT_STAGE_UPDATED, {
            contactId: lead.contactId,
            leadId: lead.id,
            pipelineId: stage.pipelineId,
            pipelineName: stage.pipelineName,
            stageId: stage.id,
            stageName: stage.name,
            stageStatus: stage.status,
          });
        }

        default:
          return;
      }
    },

    async processJob(integration, job, context) {
      if (job.triggerKey === automationDeliveryKey(platform)) {
        return delivery.deliver(integration, job, context);
      }
    },
  };
}
