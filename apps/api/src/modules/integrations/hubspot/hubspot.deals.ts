import { isAxiosError, type AxiosInstance } from "axios";

import type { Integration } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { IntegratedApps } from "../../../types/enums.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import { LEADS_PIPELINE_TYPE } from "../../pipeline/pipelineTypes.js";
import type { IntegrationEvent } from "../events/integrationEvent.types.js";
import type {
  IntegrationEventContext,
  ProviderJobData,
} from "../providers/integrationProvider.types.js";
import {
  findLinkByRateupId,
  hashSyncPayload,
  recordLink,
  removeLink,
} from "../shared/entityLink.js";
import { hubSpotClientFor } from "./hubspot.auth.js";
import { HUBSPOT_JOB_OPTIONS, hubSpotContactIdFor } from "./hubspot.contacts.js";
import { readHubSpotCredential, type HubSpotPipeline } from "./hubspot.types.js";

/**
 * RateUp's Leads board → HubSpot deals (step 2.3).
 *
 * Only the Leads board is followed, as for Zoho and GetLead. Each column maps to
 * a stage of the one HubSpot pipeline the org picked; a lead in an unmapped
 * column sends nothing. As with contacts, a job carries only the lead's id and
 * reads the lead when it runs.
 */

export const HUBSPOT_DEAL_UPSERT = "deal-upsert";

const LINK_TYPE = "lead";

/** HubSpot's built-in association type for deal → contact. */
const DEAL_TO_CONTACT = 3;

export interface HubSpotDealJobData {
  leadId: string;
}

/** The deal properties RateUp writes. Only these are hashed, sent and compared. */
export interface HubSpotDealProperties {
  dealname: string;
  pipeline: string;
  dealstage: string;
}

export async function handleHubSpotDealEvent(
  event: IntegrationEvent,
  { orgId, integration }: IntegrationEventContext,
) {
  if (!integration) return;
  if (event.type !== "lead.created" && event.type !== "lead.stage_changed") return;
  // A move HubSpot itself made (step 2.4) must not be sent straight back.
  if (event.origin === "integration") return;
  if (event.stage.pipelineType !== LEADS_PIPELINE_TYPE) return;

  const job: ProviderJobData<HubSpotDealJobData> = {
    integrationName: IntegratedApps.hubspot,
    triggerKey: HUBSPOT_DEAL_UPSERT,
    orgId,
    data: { leadId: event.lead.id },
    rateupLeadId: event.lead.id,
    ...(event.lead.contactId && { rateupContactId: event.lead.contactId }),
  };
  await integrationTriggerQueue.add(`hubspot-${HUBSPOT_DEAL_UPSERT}`, job, HUBSPOT_JOB_OPTIONS);
}

export type HubSpotDealOutcome =
  | "sync_off"
  | "lead_gone"
  | "unmapped"
  | "unchanged"
  | "updated"
  | "created";

/**
 * Sends one lead to HubSpot as a deal: through its link when it has one, else as
 * a new deal on the lead's contact. A deal deleted in HubSpot is created again.
 */
export async function processHubSpotDealJob(
  integration: Integration,
  job: ProviderJobData,
): Promise<HubSpotDealOutcome> {
  const credential = readHubSpotCredential(integration.credential);
  if (!credential?.syncDeals || !credential.dealPipelineId) return "sync_off";

  const { leadId } = job.data as HubSpotDealJobData;
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      name: true,
      stageId: true,
      pipeline: { select: { orgId: true, type: true } },
      contact: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
  if (
    !lead ||
    lead.pipeline.orgId !== integration.orgId ||
    lead.pipeline.type !== LEADS_PIPELINE_TYPE
  ) {
    return "lead_gone";
  }

  const dealstage = credential.stageMappings?.find(
    (mapping) => mapping.stageId === lead.stageId,
  )?.hubspotStageId;
  if (!dealstage) return "unmapped";

  const properties: HubSpotDealProperties = {
    dealname: lead.name,
    pipeline: credential.dealPipelineId,
    dealstage,
  };
  const key = { integrationId: integration.id, entityType: LINK_TYPE };
  const client = await hubSpotClientFor(integration);

  const link = await findLinkByRateupId(key, lead.id);
  if (link) {
    if (link.lastSyncHash === hashSyncPayload(properties)) return "unchanged";
    try {
      await client.patch(`/crm/v3/objects/deals/${link.externalId}`, { properties });
      await recordLink(key, {
        rateupId: lead.id,
        externalId: link.externalId,
        payload: properties,
      });
      return "updated";
    } catch (error) {
      if (!(isAxiosError(error) && error.response?.status === 404)) throw error;
      await removeLink(key, lead.id);
    }
  }

  const contactId = lead.contact
    ? await hubSpotContactIdFor(integration, client, lead.contact)
    : null;
  const response = await client.post<{ id: string }>("/crm/v3/objects/deals", {
    properties,
    ...(contactId && {
      associations: [
        {
          to: { id: contactId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: DEAL_TO_CONTACT }],
        },
      ],
    }),
  });
  await recordLink(key, { rateupId: lead.id, externalId: response.data.id, payload: properties });
  return "created";
}

/** The account's deal pipelines with their stages, each in HubSpot's own order. */
export async function listHubSpotDealPipelines(client: AxiosInstance): Promise<HubSpotPipeline[]> {
  const response = await client.get<{ results: HubSpotPipeline[] }>("/crm/v3/pipelines/deals");
  return (response.data.results ?? [])
    .map((pipeline) => ({
      ...pipeline,
      stages: [...pipeline.stages].sort((a, b) => a.displayOrder - b.displayOrder),
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}
