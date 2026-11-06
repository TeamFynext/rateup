import { IntegratedApps } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import type { IntegrationEventType } from "../events/integrationEvent.types.js";
import type { IntegrationProvider } from "../providers/integrationProvider.types.js";
import { getPipedriveAccessToken, pipedriveOAuthConfig } from "./pipedrive.client.js";
import { connectPipedrive, disconnectPipedrive } from "./pipedrive.connect.js";
import {
  handlePipedriveContactEvent,
  PIPEDRIVE_CONTACT_UPSERT,
  processPipedriveContactJob,
} from "./pipedrive.contacts.js";
import {
  handlePipedriveDealEvent,
  PIPEDRIVE_DEAL_UPSERT,
  processPipedriveDealJob,
} from "./pipedrive.deals.js";
import {
  handlePipedriveNoteEvent,
  PIPEDRIVE_NOTE,
  processPipedriveNoteJob,
} from "./pipedrive.notes.js";
import { readPipedriveCredential } from "./pipedrive.types.js";

/** The bulk job's trigger key; `pipedrive.bulk.ts` itself is loaded on use. */
const PIPEDRIVE_BULK = "bulk";
import {
  handlePipedriveInbound,
  PIPEDRIVE_INBOUND,
  syncPipedriveWebhooks,
} from "./pipedrive.webhooks.js";

const CONTACT_PUSH_EVENTS: readonly IntegrationEventType[] = ["contact.created", "contact.updated"];
const DEAL_EVENTS: readonly IntegrationEventType[] = ["lead.created", "lead.stage_changed"];

/**
 * Pipedrive CRM, in the registry: connecting (5.1), contacts → persons (5.2),
 * Leads board deals (5.3), changes made in Pipedrive coming back (5.4), notes
 * (5.5) and the first-time sync (5.6).
 */
export const pipedriveProvider: IntegrationProvider = {
  name: IntegratedApps.pipedrive,
  label: "Pipedrive",
  auth: "oauth2",
  connection: "integration",
  events: [
    ...CONTACT_PUSH_EVENTS,
    "contact.deleted",
    ...DEAL_EVENTS,
    "conversation.closed",
    "survey.response_submitted",
  ],

  // A deleted contact's link is forgotten whether or not contacts are being sent,
  // so turning the switch on later never finds links to contacts that are gone.
  subscribedEvents(integration) {
    const credential = readPipedriveCredential(integration?.credential);
    return [
      ...(credential?.syncContacts ? CONTACT_PUSH_EVENTS : []),
      "contact.deleted",
      ...(credential?.syncDeals ? DEAL_EVENTS : []),
      ...(credential?.logConversations ? (["conversation.closed"] as const) : []),
      ...(credential?.logSurveyResponses ? (["survey.response_submitted"] as const) : []),
    ];
  },

  async handleEvent(event, context) {
    if (event.type === "lead.created" || event.type === "lead.stage_changed") {
      return handlePipedriveDealEvent(event, context);
    }
    if (event.type === "conversation.closed" || event.type === "survey.response_submitted") {
      return handlePipedriveNoteEvent(event, context);
    }
    return handlePipedriveContactEvent(event, context);
  },

  async processJob(integration, job) {
    if (job.triggerKey === PIPEDRIVE_CONTACT_UPSERT) {
      await processPipedriveContactJob(integration, job);
    } else if (job.triggerKey === PIPEDRIVE_DEAL_UPSERT) {
      await processPipedriveDealJob(integration, job);
    } else if (job.triggerKey === PIPEDRIVE_NOTE) {
      await processPipedriveNoteJob(integration, job);
    } else if (job.triggerKey === PIPEDRIVE_INBOUND) {
      // Loaded on use, as is the bulk run: applying a change reaches contacts,
      // leads and the fan-out, which the registry importing this module must not
      // pull in.
      const { processPipedriveInboundJob } = await import("./pipedrive.inbound.js");
      await processPipedriveInboundJob(integration, job);
    } else if (job.triggerKey === PIPEDRIVE_BULK) {
      const { processPipedriveBulkJob } = await import("./pipedrive.bulk.js");
      await processPipedriveBulkJob(integration, job);
    }
  },

  handleInbound: handlePipedriveInbound,

  oauth: {
    config: pipedriveOAuthConfig,
    // Chosen on the app in Pipedrive's Developer Hub; the authorize URL carries none.
    scopes: [],
    connect: connectPipedrive,
  },

  // Access tokens are refreshed on use. The scheduled sweep still refreshes, which
  // keeps the 60-day refresh token alive and notices a grant revoked from Pipedrive.
  async refreshCredential(integration) {
    await getPipedriveAccessToken(integration, { force: true });
    // Pipedrive deletes a webhook after three days of failed deliveries; this puts
    // it back. The refresh above counts as the health check, so a failure here
    // is only logged.
    const current = await prisma.integration.findUnique({ where: { id: integration.id } });
    if (current) {
      await syncPipedriveWebhooks(current).catch((error) =>
        log.warn({ err: error, integrationId: integration.id }, "Pipedrive webhooks not checked"),
      );
    }
  },

  disconnect: disconnectPipedrive,
};
