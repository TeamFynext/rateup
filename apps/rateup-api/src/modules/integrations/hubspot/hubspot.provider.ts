import { IntegratedApps } from "../../../types/enums.js";
import type { IntegrationEventType } from "../events/integrationEvent.types.js";
import type { IntegrationProvider } from "../providers/integrationProvider.types.js";
import { getHubSpotAccessToken, HUBSPOT_SCOPES, hubSpotOAuthConfig } from "./hubspot.auth.js";
import { connectHubSpot, disconnectHubSpot } from "./hubspot.connect.js";
import {
  handleHubSpotContactEvent,
  HUBSPOT_CONTACT_UPSERT,
  processHubSpotContactJob,
} from "./hubspot.contacts.js";
import {
  handleHubSpotDealEvent,
  HUBSPOT_DEAL_UPSERT,
  processHubSpotDealJob,
} from "./hubspot.deals.js";
import { HUBSPOT_BULK, processHubSpotBulkJob } from "./hubspot.bulk.js";
import { processHubSpotInboundJob } from "./hubspot.inbound.js";
import { handleHubSpotNoteEvent, HUBSPOT_NOTE, processHubSpotNoteJob } from "./hubspot.notes.js";
import { HUBSPOT_INBOUND } from "./hubspot.webhook.js";
import { readHubSpotCredential } from "./hubspot.types.js";

const CONTACT_PUSH_EVENTS: readonly IntegrationEventType[] = ["contact.created", "contact.updated"];
const DEAL_EVENTS: readonly IntegrationEventType[] = ["lead.created", "lead.stage_changed"];

/** HubSpot CRM, in the registry: contacts (2.2), Leads board deals (2.3), notes (2.5). */
export const hubSpotProvider: IntegrationProvider = {
  name: IntegratedApps.hubspot,
  label: "HubSpot",
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
    const credential = readHubSpotCredential(integration?.credential);
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
      return handleHubSpotDealEvent(event, context);
    }
    if (event.type === "conversation.closed" || event.type === "survey.response_submitted") {
      return handleHubSpotNoteEvent(event, context);
    }
    return handleHubSpotContactEvent(event, context);
  },

  async processJob(integration, job) {
    if (job.triggerKey === HUBSPOT_CONTACT_UPSERT) {
      await processHubSpotContactJob(integration, job);
    } else if (job.triggerKey === HUBSPOT_DEAL_UPSERT) {
      await processHubSpotDealJob(integration, job);
    } else if (job.triggerKey === HUBSPOT_INBOUND) {
      // HubSpot → RateUp. Queued by the app webhook endpoint (`hubspot.webhook.ts`),
      // which routes by account, so it is not `handleInbound` on the shared receiver.
      await processHubSpotInboundJob(integration, job);
    } else if (job.triggerKey === HUBSPOT_NOTE) {
      await processHubSpotNoteJob(integration, job);
    } else if (job.triggerKey === HUBSPOT_BULK) {
      await processHubSpotBulkJob(integration, job);
    }
  },

  oauth: {
    config: hubSpotOAuthConfig,
    scopes: HUBSPOT_SCOPES,
    connect: connectHubSpot,
  },

  // Access tokens are refreshed on use (they outlive no cron interval). The
  // scheduled sweep still refreshes, which is what notices a revoked grant and
  // marks the integration as needing attention.
  async refreshCredential(integration) {
    await getHubSpotAccessToken(integration, { force: true });
  },

  disconnect: disconnectHubSpot,
};
