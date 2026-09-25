import { axiosClient } from "../apiClient";
import type {
  BulkUpdateLeadsInput,
  CloseLeadInput,
  CreateLeadInput,
  CreatePipelineInput,
  CreateStageInput,
  CreateTaskInput,
  Lead,
  LeadDetail,
  LeadNote,
  LeadTask,
  PipelineDetail,
  PipelineLabel,
  PipelineLostReason,
  PipelineStage,
  PipelineSummary,
  PipelineUser,
  UpdateLeadInput,
  UpdatePipelineInput,
  UpdateStageInput,
  UpdateTaskInput,
  TeamPipelineDefault,
  UpdateTeamDefaultInput,
  ContactStage,
  BulkStageResult,
  ForecastBucket,
  LeadListParams,
  LeadPage,
  PipelineStats,
} from "./pipeline.types";

const PIPELINE_URL = "/pipelines";

// ------------------------------------------------------------------ pipelines

export async function fetchPipelines() {
  const { data } = await axiosClient.get<PipelineSummary[]>(PIPELINE_URL);
  return data;
}

export async function fetchPipeline(pipelineId: string) {
  const { data } = await axiosClient.get<PipelineDetail>(`${PIPELINE_URL}/${pipelineId}`);
  return data;
}

/** Every count the board shows, over the whole pipeline rather than one page. */
export async function fetchPipelineStats(pipelineId: string) {
  const { data } = await axiosClient.get<PipelineStats>(`${PIPELINE_URL}/${pipelineId}/stats`);
  return data;
}

export async function fetchPipelineForecast(pipelineId: string) {
  const { data } = await axiosClient.get<ForecastBucket[]>(
    `${PIPELINE_URL}/${pipelineId}/forecast`,
  );
  return data;
}

export async function fetchPipelineMembers(pipelineId: string) {
  const { data } = await axiosClient.get<PipelineUser[]>(`${PIPELINE_URL}/${pipelineId}/members`);
  return data;
}

export async function createPipeline(input: CreatePipelineInput) {
  const { data } = await axiosClient.post<PipelineDetail>(PIPELINE_URL, input);
  return data;
}

export async function updatePipeline(pipelineId: string, input: UpdatePipelineInput) {
  const { data } = await axiosClient.put<PipelineSummary>(`${PIPELINE_URL}/${pipelineId}`, input);
  return data;
}

export async function deletePipeline(pipelineId: string) {
  await axiosClient.delete(`${PIPELINE_URL}/${pipelineId}`);
}

// --------------------------------------------------------------------- stages

export async function createStage(input: CreateStageInput) {
  const { data } = await axiosClient.post<PipelineStage>(`${PIPELINE_URL}/stages`, input);
  return data;
}

export async function updateStage(stageId: string, input: UpdateStageInput) {
  const { data } = await axiosClient.put<PipelineStage>(`${PIPELINE_URL}/stages/${stageId}`, input);
  return data;
}

/**
 * `moveLeadsToStageId` is required when the stage still holds leads — the API
 * answers 409 rather than deleting them along with the stage.
 */
export async function deleteStage(stageId: string, moveLeadsToStageId?: string) {
  await axiosClient.delete(`${PIPELINE_URL}/stages/${stageId}`, {
    params: moveLeadsToStageId ? { moveLeadsToStageId } : undefined,
  });
}

export async function reorderStages(
  pipelineId: string,
  stages: Array<{ id: string; order: number }>,
) {
  const { data } = await axiosClient.put<PipelineStage[]>(`${PIPELINE_URL}/stages/reorder`, {
    pipelineId,
    stages,
  });
  return data;
}

// --------------------------------------------------------------- lost reasons

export async function createLostReason(pipelineId: string, label: string) {
  const { data } = await axiosClient.post<PipelineLostReason>(
    `${PIPELINE_URL}/${pipelineId}/lost-reasons`,
    { label },
  );
  return data;
}

export async function updateLostReason(
  reasonId: string,
  input: { label?: string; order?: number },
) {
  const { data } = await axiosClient.put<PipelineLostReason>(
    `${PIPELINE_URL}/lost-reasons/${reasonId}`,
    input,
  );
  return data;
}

export async function deleteLostReason(reasonId: string) {
  await axiosClient.delete(`${PIPELINE_URL}/lost-reasons/${reasonId}`);
}

// --------------------------------------------------------------------- labels

export async function createLabel(pipelineId: string, input: { name: string; color: string }) {
  const { data } = await axiosClient.post<PipelineLabel>(
    `${PIPELINE_URL}/${pipelineId}/labels`,
    input,
  );
  return data;
}

export async function updateLabel(labelId: string, input: { name?: string; color?: string }) {
  const { data } = await axiosClient.put<PipelineLabel>(`${PIPELINE_URL}/labels/${labelId}`, input);
  return data;
}

export async function deleteLabel(labelId: string) {
  await axiosClient.delete(`${PIPELINE_URL}/labels/${labelId}`);
}

// ---------------------------------------------------------------------- leads

/**
 * One keyset page of leads.
 *
 * The board calls this once per column (with that column's `stageId`), so a
 * stage holding a single match still returns it — a board-wide limit would let
 * the busiest column swallow the page.
 */
export async function fetchLeadPage(
  pipelineId: string,
  params: LeadListParams,
  cursor?: string,
  limit = 50,
) {
  const { data } = await axiosClient.get<LeadPage>(`${PIPELINE_URL}/leads`, {
    params: { pipelineId, limit, ...(cursor ? { cursor } : {}), ...params },
  });
  return data;
}

export async function fetchLead(leadId: string) {
  const { data } = await axiosClient.get<LeadDetail>(`${PIPELINE_URL}/leads/${leadId}`);
  return data;
}

export async function createLead(input: CreateLeadInput) {
  const { data } = await axiosClient.post<Lead>(`${PIPELINE_URL}/leads`, input);
  return data;
}

export async function updateLead(leadId: string, input: UpdateLeadInput) {
  const { data } = await axiosClient.put<Lead>(`${PIPELINE_URL}/leads/${leadId}`, input);
  return data;
}

export async function deleteLead(leadId: string) {
  await axiosClient.delete(`${PIPELINE_URL}/leads/${leadId}`);
}

export async function moveLead(leadId: string, stageId: string) {
  const { data } = await axiosClient.put<Lead>(`${PIPELINE_URL}/leads/${leadId}/move`, { stageId });
  return data;
}

export async function closeLead(leadId: string, input: CloseLeadInput) {
  const { data } = await axiosClient.put<Lead>(`${PIPELINE_URL}/leads/${leadId}/close`, input);
  return data;
}

export async function reopenLead(leadId: string) {
  const { data } = await axiosClient.put<Lead>(`${PIPELINE_URL}/leads/${leadId}/reopen`);
  return data;
}

export async function bulkUpdateLeads(input: BulkUpdateLeadsInput) {
  const { data } = await axiosClient.put<Lead[]>(`${PIPELINE_URL}/leads/bulk`, input);
  return data;
}

export async function bulkDeleteLeads(leadIds: string[]) {
  const { data } = await axiosClient.post<{ deleted: number }>(
    `${PIPELINE_URL}/leads/bulk/delete`,
    { leadIds },
  );
  return data;
}

/** Why a row was left out; mirrors `ImportSkipReason` in rateup-api's `lead.import.ts`. */
export type LeadImportSkipReason =
  | "MISSING_NAME"
  | "INVALID_PHONE"
  | "INVALID_EMAIL"
  | "UNKNOWN_STAGE"
  | "UNKNOWN_SOURCE"
  | "UNKNOWN_ASSIGNEE"
  | "INVALID_DATE"
  | "ALREADY_ON_BOARD"
  | "FAILED";

export interface LeadImportResult {
  created: number;
  skipped: Array<{ row: number; name: string; reason: LeadImportSkipReason; value?: string }>;
}

export async function importLeads({ pipelineId, file }: { pipelineId: string; file: File }) {
  const form = new FormData();
  form.append("file", file);
  // Each row is a full lead create on the server, so a large file takes a while.
  const { data } = await axiosClient.post<LeadImportResult>(
    `${PIPELINE_URL}/${pipelineId}/import`,
    form,
    { timeout: 180_000 },
  );
  return data;
}

export type PipelineExportFormat = "xlsx" | "ods";

/** The leads the board's current filters show, as a spreadsheet the importer can read back. */
export async function exportPipeline({
  pipelineId,
  params,
  format,
}: {
  pipelineId: string;
  params: LeadListParams;
  format: PipelineExportFormat;
}) {
  const { data } = await axiosClient.get<Blob>(`${PIPELINE_URL}/${pipelineId}/export`, {
    params: { ...params, format },
    responseType: "blob",
    // A large board is built in one response; the default timeout would cut it off.
    timeout: 0,
  });
  return data;
}

export async function fetchImportTemplate(pipelineId: string, format: "csv" | "xlsx") {
  const { data } = await axiosClient.get<Blob>(`${PIPELINE_URL}/${pipelineId}/import-template`, {
    params: { format },
    responseType: "blob",
  });
  return data;
}

// ------------------------------------------------------------- notes & tasks

export async function createLeadNote(leadId: string, text: string) {
  const { data } = await axiosClient.post<LeadNote>(`${PIPELINE_URL}/leads/${leadId}/notes`, {
    text,
  });
  return data;
}

export async function deleteLeadNote(noteId: string) {
  await axiosClient.delete(`${PIPELINE_URL}/leads/notes/${noteId}`);
}

export async function createLeadTask(leadId: string, input: CreateTaskInput) {
  const { data } = await axiosClient.post<LeadTask>(`${PIPELINE_URL}/leads/${leadId}/tasks`, input);
  return data;
}

export async function updateLeadTask(taskId: string, input: UpdateTaskInput) {
  const { data } = await axiosClient.put<LeadTask>(`${PIPELINE_URL}/leads/tasks/${taskId}`, input);
  return data;
}

export async function deleteLeadTask(taskId: string) {
  await axiosClient.delete(`${PIPELINE_URL}/leads/tasks/${taskId}`);
}

export async function fetchTeamPipelineDefaults() {
  const { data } = await axiosClient.get<TeamPipelineDefault[]>(`${PIPELINE_URL}/team-defaults`);
  return data;
}

export async function updateTeamPipelineDefault(teamId: string, input: UpdateTeamDefaultInput) {
  const { data } = await axiosClient.put<TeamPipelineDefault>(
    `${PIPELINE_URL}/team-defaults/${teamId}`,
    input,
  );
  return data;
}

// -------------------------------------------------------------- contact stage

/** Null when the org has no board — an ordinary state, not an error. */
export async function fetchContactStage(contactId: string) {
  const { data } = await axiosClient.get<ContactStage | null>(
    `${PIPELINE_URL}/leads/contact/${contactId}/stage`,
  );
  return data;
}

export async function setContactStage(contactId: string, stageId: string) {
  const { data } = await axiosClient.put(`${PIPELINE_URL}/leads/contact/${contactId}/stage`, {
    stageId,
  });
  return data;
}

/**
 * The contacts table's bulk assign. One request for the whole selection, and the
 * reply says how many actually moved — a selection can hold contacts already on
 * the target column.
 */
export async function bulkSetContactStage(contactIds: string[], stageId: string) {
  const { data } = await axiosClient.put<BulkStageResult>(`${PIPELINE_URL}/leads/contacts/stage`, {
    contactIds,
    stageId,
  });
  return data;
}

/** Deletes the lead holding the stage, and everything on it. */
export async function clearContactStage(contactId: string) {
  const { data } = await axiosClient.delete<{ leadId: string | null }>(
    `${PIPELINE_URL}/leads/contact/${contactId}/stage`,
  );
  return data;
}
