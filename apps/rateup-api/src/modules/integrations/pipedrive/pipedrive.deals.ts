import { isAxiosError, type AxiosInstance } from "axios";

import type { Integration } from "../../../../generated/prisma/client.js";
import { IntegratedApps } from "../../../types/enums.js";
import prisma from "../../../utils/prisma.js";
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
import { pipedriveClientFor } from "./pipedrive.client.js";
import { PIPEDRIVE_JOB_OPTIONS, pipedrivePersonIdFor } from "./pipedrive.contacts.js";
import { readPipedriveCredential, type PipedrivePipeline } from "./pipedrive.types.js";

/**
 * RateUp's Leads board → Pipedrive deals (step 5.3).
 *
 * Only the Leads board is followed. Each open column maps to a stage of the one
 * Pipedrive pipeline the org picked; a lead in an unmapped open column sends
 * nothing. Won and Lost columns need no mapping: Pipedrive keeps won and lost as
 * a deal's status, not as stages, so landing there marks the deal won or lost and
 * leaves it on the stage it reached. As with contacts, a job carries only the
 * lead's id and reads the lead when it runs.
 */

export const PIPEDRIVE_DEAL_UPSERT = "deal-upsert";

const LINK_TYPE = "lead";

export interface PipedriveDealJobData {
  leadId: string;
}

/** What RateUp writes to a deal. Only this is hashed and compared. */
export interface PipedriveDealFields {
  title: string;
  pipeline_id: number;
  /** Absent for a won or lost deal, which stays on the stage it reached. */
  stage_id?: number;
  status: "open" | "won" | "lost";
  lost_reason?: string;
}

export async function handlePipedriveDealEvent(
  event: IntegrationEvent,
  { orgId, integration }: IntegrationEventContext,
) {
  if (!integration) return;
  if (event.type !== "lead.created" && event.type !== "lead.stage_changed") return;
  // A move Pipedrive itself made (step 5.4) must not be sent straight back.
  if (event.origin === "integration") return;
  if (event.stage.pipelineType !== LEADS_PIPELINE_TYPE) return;

  const job: ProviderJobData<PipedriveDealJobData> = {
    integrationName: IntegratedApps.pipedrive,
    triggerKey: PIPEDRIVE_DEAL_UPSERT,
    orgId,
    data: { leadId: event.lead.id },
    rateupLeadId: event.lead.id,
    ...(event.lead.contactId && { rateupContactId: event.lead.contactId }),
  };
  await integrationTriggerQueue.add(
    `pipedrive-${PIPEDRIVE_DEAL_UPSERT}`,
    job,
    PIPEDRIVE_JOB_OPTIONS,
  );
}

export type PipedriveDealOutcome =
  | "sync_off"
  | "lead_gone"
  | "unmapped"
  | "unchanged"
  | "updated"
  | "created";

/**
 * The deal fields for a lead in a column, or null when the column sends nothing
 * (an open column with no stage mapped).
 */
export function toPipedriveDealFields(
  lead: {
    name: string;
    stageId: string;
    stage: { status: "OPEN" | "WON" | "LOST" };
    lostReason?: { label: string } | null;
  },
  settings: {
    dealPipelineId: number;
    stageMappings?: { stageId: string; pipedriveStageId: number }[];
  },
): PipedriveDealFields | null {
  const base = { title: lead.name, pipeline_id: settings.dealPipelineId };
  if (lead.stage.status === "WON") return { ...base, status: "won" };
  if (lead.stage.status === "LOST") {
    return {
      ...base,
      status: "lost",
      ...(lead.lostReason?.label && { lost_reason: lead.lostReason.label }),
    };
  }
  const stageId = settings.stageMappings?.find(
    (mapping) => mapping.stageId === lead.stageId,
  )?.pipedriveStageId;
  return stageId === undefined ? null : { ...base, stage_id: stageId, status: "open" };
}

/**
 * Sends one lead to Pipedrive as a deal: through its link when it has one, else as
 * a new deal on the lead's contact's person. A deal deleted in Pipedrive is created
 * again.
 */
export async function processPipedriveDealJob(
  integration: Integration,
  job: ProviderJobData,
): Promise<PipedriveDealOutcome> {
  const credential = readPipedriveCredential(integration.credential);
  if (!credential?.syncDeals || !credential.dealPipelineId) return "sync_off";

  const { leadId } = job.data as PipedriveDealJobData;
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      name: true,
      stageId: true,
      stage: { select: { status: true } },
      lostReason: { select: { label: true } },
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

  const fields = toPipedriveDealFields(lead, {
    dealPipelineId: credential.dealPipelineId,
    stageMappings: credential.stageMappings,
  });
  if (!fields) return "unmapped";

  const key = { integrationId: integration.id, entityType: LINK_TYPE };
  const client = await pipedriveClientFor(integration);

  const link = await findLinkByRateupId(key, lead.id);
  if (link) {
    if (link.lastSyncHash === hashSyncPayload(fields)) return "unchanged";
    if (await patchDeal(client, link.externalId, fields)) {
      await recordLink(key, { rateupId: lead.id, externalId: link.externalId, payload: fields });
      return "updated";
    }
    await removeLink(key, lead.id);
  }

  const personId = lead.contact
    ? await pipedrivePersonIdFor(integration, client, lead.contact)
    : null;
  const response = await client.post<{ data: { id: number } }>("/v2/deals", {
    ...fields,
    ...(personId !== null && { person_id: personId }),
  });
  await recordLink(key, {
    rateupId: lead.id,
    externalId: String(response.data.data.id),
    payload: fields,
  });
  return "created";
}

/**
 * Edits a linked deal. False when the deal is gone from Pipedrive: deleted deals
 * linger there for 30 days, flagged, before they answer 404.
 */
async function patchDeal(client: AxiosInstance, dealId: string, fields: PipedriveDealFields) {
  try {
    // A deal reopened from won or lost gets a stage again; one closing keeps its stage.
    const response = await client.patch<{ data?: { is_deleted?: boolean } }>(
      `/v2/deals/${dealId}`,
      fields,
    );
    return !response.data.data?.is_deleted;
  } catch (error) {
    if (isAxiosError(error) && [404, 410].includes(error.response?.status ?? 0)) return false;
    throw error;
  }
}

interface PipedriveList<T> {
  data?: T[] | null;
  additional_data?: { next_cursor?: string | null };
}

/** Every page of a v2 list. Pipedrive's lists are cursor-paged, 500 at most a page. */
async function listAll<T>(client: AxiosInstance, url: string): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  do {
    const response = await client.get<PipedriveList<T>>(url, {
      params: { limit: 500, ...(cursor && { cursor }) },
    });
    items.push(...(response.data.data ?? []));
    cursor = response.data.additional_data?.next_cursor ?? undefined;
  } while (cursor);
  return items;
}

interface PipedriveOrdered {
  id: number;
  name: string;
  order_nr: number;
  is_deleted?: boolean;
}

/** The company's deal pipelines with their stages, each in Pipedrive's own order. */
export async function listPipedrivePipelines(client: AxiosInstance): Promise<PipedrivePipeline[]> {
  const [pipelines, stages] = await Promise.all([
    listAll<PipedriveOrdered>(client, "/v2/pipelines"),
    listAll<PipedriveOrdered & { pipeline_id: number }>(client, "/v2/stages"),
  ]);
  const byOrder = (a: PipedriveOrdered, b: PipedriveOrdered) => a.order_nr - b.order_nr;
  return pipelines
    .filter((pipeline) => !pipeline.is_deleted)
    .sort(byOrder)
    .map((pipeline) => ({
      id: pipeline.id,
      name: pipeline.name,
      stages: stages
        .filter((stage) => stage.pipeline_id === pipeline.id && !stage.is_deleted)
        .sort(byOrder)
        .map(({ id, name }) => ({ id, name })),
    }));
}
