import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { contactKeys } from "@/backend/campaign/contacts/contacts.keys.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import * as api from "./pipeline.api";
import { pipelineKeys } from "./pipeline.keys";
import type {
  BulkUpdateLeadsInput,
  CloseLeadInput,
  CreateLeadInput,
  CreatePipelineInput,
  CreateStageInput,
  CreateTaskInput,
  Lead,
  PipelineDetail,
  UpdateLeadInput,
  UpdatePipelineInput,
  UpdateStageInput,
  UpdateTaskInput,
  UpdateTeamDefaultInput,
} from "./pipeline.types";

// ------------------------------------------------------------------- queries

/**
 * `enabled` exists for the app sidebar, which is mounted on every dashboard
 * route but only needs the pipeline switcher while the user is actually on the
 * pipeline. The page itself leaves it defaulted.
 */
export function usePipelinesQuery(enabled = true) {
  return useQuery({
    queryKey: pipelineKeys.list(),
    queryFn: api.fetchPipelines,
    enabled,
  });
}

export function usePipelineQuery(pipelineId: string | undefined) {
  return useQuery({
    queryKey: pipelineKeys.detail(pipelineId),
    queryFn: () => api.fetchPipeline(pipelineId!),
    enabled: Boolean(pipelineId),
  });
}

export function usePipelineMembersQuery(pipelineId: string | undefined) {
  return useQuery({
    queryKey: pipelineKeys.members(pipelineId),
    queryFn: () => api.fetchPipelineMembers(pipelineId!),
    enabled: Boolean(pipelineId),
  });
}

export function useLeadsQuery(pipelineId: string | undefined) {
  return useQuery({
    queryKey: pipelineKeys.leads(pipelineId),
    queryFn: () => api.fetchLeads(pipelineId!),
    enabled: Boolean(pipelineId),
  });
}

export function useLeadQuery(leadId: string | undefined) {
  return useQuery({
    queryKey: pipelineKeys.lead(leadId),
    queryFn: () => api.fetchLead(leadId!),
    enabled: Boolean(leadId),
  });
}

/** Teams and the board each one sends its contacts to. */
export function useTeamPipelineDefaultsQuery(enabled = true) {
  return useQuery({
    queryKey: pipelineKeys.teamDefaults(),
    queryFn: api.fetchTeamPipelineDefaults,
    enabled,
  });
}

// ----------------------------------------------------------------- mutations

/**
 * Every pipeline mutation lands here: it reports through a toast keyed by
 * action (so a burst of drags collapses into one message) and sweeps the
 * `["pipeline"]` root, which covers the board, the list and the switcher counts.
 *
 * Contacts are not swept: a lead and the contact behind it are separate records
 * now, and moving one no longer writes anything onto the other.
 */
/**
 * Both message builders take `t` rather than returning a bare string. A plain
 * `t(options.errorFallback)` inside here would translate at runtime but the key
 * is a variable, so `i18next-cli extract` never sees it and the locale files
 * never gain the entry. Passing `t` in puts a literal `t("…")` at every call
 * site, which is what the extractor reads.
 */
function usePipelineMutation<TVariables, TResult>(options: {
  mutationFn: (variables: TVariables) => Promise<TResult>;
  success?: (t: TFunction, result: TResult, variables: TVariables) => string;
  errorFallback: (t: TFunction) => string;
  toastId: string;
}) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: (result, variables) => {
      if (options.success) {
        toast.success(options.success(t, result, variables), { id: options.toastId });
      }
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, options.errorFallback(t)), { id: options.toastId });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all() });
    },
  });
}

export function useCreatePipelineMutation() {
  // Typed on the result, unlike the rest: the create dialog navigates to the new
  // pipeline, so it needs the id back.
  return usePipelineMutation<CreatePipelineInput, PipelineDetail>({
    mutationFn: api.createPipeline,
    success: (t, _result, variables) => t("{name} created", { name: variables.name }),
    errorFallback: (t) => t("Could not create the pipeline"),
    toastId: "pipeline-create",
  });
}

export function useUpdatePipelineMutation() {
  return usePipelineMutation<{ pipelineId: string; input: UpdatePipelineInput }, unknown>({
    mutationFn: ({ pipelineId, input }) => api.updatePipeline(pipelineId, input),
    success: (t) => t("Pipeline settings saved"),
    errorFallback: (t) => t("Could not save the pipeline settings"),
    toastId: "pipeline-update",
  });
}

export function useDeletePipelineMutation() {
  return usePipelineMutation<string, unknown>({
    mutationFn: api.deletePipeline,
    success: (t) => t("Pipeline deleted"),
    errorFallback: (t) => t("Could not delete the pipeline"),
    toastId: "pipeline-delete",
  });
}

export function useCreateStageMutation() {
  return usePipelineMutation<CreateStageInput, unknown>({
    mutationFn: api.createStage,
    success: (t, _result, variables) => t("{name} added", { name: variables.name }),
    errorFallback: (t) => t("Could not add the stage"),
    toastId: "pipeline-stage-create",
  });
}

export function useUpdateStageMutation() {
  return usePipelineMutation<{ stageId: string; input: UpdateStageInput }, unknown>({
    mutationFn: ({ stageId, input }) => api.updateStage(stageId, input),
    errorFallback: (t) => t("Could not save the stage"),
    toastId: "pipeline-stage-update",
  });
}

export function useDeleteStageMutation() {
  return usePipelineMutation<{ stageId: string; moveLeadsToStageId?: string }, unknown>({
    mutationFn: ({ stageId, moveLeadsToStageId }) => api.deleteStage(stageId, moveLeadsToStageId),
    success: (t) => t("Stage deleted"),
    errorFallback: (t) => t("Could not delete the stage"),
    toastId: "pipeline-stage-delete",
  });
}

/**
 * Reordering the board's columns.
 *
 * The only stage mutation that writes to the cache before the server answers.
 * The others change a field in place, so waiting for the refetch costs nothing
 * visible; this one moves a row the user has just dragged, and without the
 * optimistic write the row snaps back to where it was and then jumps again when
 * the refetch lands. `onSettled` still invalidates, so the server's order wins.
 */
export function useReorderStagesMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({
      pipelineId,
      stages,
    }: {
      pipelineId: string;
      stages: Array<{ id: string; order: number }>;
    }) => api.reorderStages(pipelineId, stages),

    onMutate: async ({ pipelineId, stages }) => {
      const key = pipelineKeys.detail(pipelineId);
      // Otherwise an in-flight detail fetch can land after this write and undo it.
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PipelineDetail>(key);
      if (!previous) return { key, previous };

      const orderById = new Map(stages.map((stage) => [stage.id, stage.order]));
      queryClient.setQueryData<PipelineDetail>(key, {
        ...previous,
        stages: previous.stages
          .map((stage) => ({ ...stage, order: orderById.get(stage.id) ?? stage.order }))
          .sort((a, b) => a.order - b.order),
      });

      return { key, previous };
    },

    onError: (error, _variables, context) => {
      // Put the old order back rather than leaving the board showing a sequence
      // the server rejected.
      if (context?.previous) queryClient.setQueryData(context.key, context.previous);
      toast.error(getApiErrorMessage(error, t("Could not reorder the stages")), {
        id: "pipeline-stage-reorder",
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all() });
    },
  });
}

export function useCreateLostReasonMutation() {
  return usePipelineMutation<{ pipelineId: string; label: string }, unknown>({
    mutationFn: ({ pipelineId, label }) => api.createLostReason(pipelineId, label),
    errorFallback: (t) => t("Could not add the lost reason"),
    toastId: "pipeline-lost-reason-create",
  });
}

export function useDeleteLostReasonMutation() {
  return usePipelineMutation<string, unknown>({
    mutationFn: api.deleteLostReason,
    errorFallback: (t) => t("Could not delete the lost reason"),
    toastId: "pipeline-lost-reason-delete",
  });
}

export function useCreateLabelMutation() {
  return usePipelineMutation<{ pipelineId: string; name: string; color: string }, unknown>({
    mutationFn: ({ pipelineId, name, color }) => api.createLabel(pipelineId, { name, color }),
    errorFallback: (t) => t("Could not add the label"),
    toastId: "pipeline-label-create",
  });
}

export function useDeleteLabelMutation() {
  return usePipelineMutation<string, unknown>({
    mutationFn: api.deleteLabel,
    errorFallback: (t) => t("Could not delete the label"),
    toastId: "pipeline-label-delete",
  });
}

export function useCreateLeadMutation() {
  return usePipelineMutation<CreateLeadInput, unknown>({
    mutationFn: api.createLead,
    success: (t, _result, variables) => t("{name} added to the pipeline", { name: variables.name }),
    errorFallback: (t) => t("Could not add the lead"),
    toastId: "pipeline-lead-create",
  });
}

export function useUpdateLeadMutation() {
  return usePipelineMutation<{ leadId: string; input: UpdateLeadInput }, unknown>({
    mutationFn: ({ leadId, input }) => api.updateLead(leadId, input),
    errorFallback: (t) => t("Could not save the lead"),
    toastId: "pipeline-lead-update",
  });
}

export function useDeleteLeadMutation() {
  return usePipelineMutation<string, unknown>({
    mutationFn: api.deleteLead,
    success: (t) => t("Lead deleted"),
    errorFallback: (t) => t("Could not delete the lead"),
    toastId: "pipeline-lead-delete",
  });
}

/**
 * Dragging a card has to land instantly, so the lead list is rewritten before
 * the request goes out and rolled back if it fails. The board reads
 * `stage.isWon` off each lead, so the optimistic copy carries the whole stage.
 */
export function useMoveLeadMutation(pipelineId: string | undefined) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const leadsKey = pipelineKeys.leads(pipelineId);

  return useMutation({
    mutationFn: ({ leadId, stageId }: { leadId: string; stageId: string; stageName?: string }) =>
      api.moveLead(leadId, stageId),
    onMutate: async ({ leadId, stageId }) => {
      await queryClient.cancelQueries({ queryKey: leadsKey });
      const previous = queryClient.getQueryData<Lead[]>(leadsKey);
      if (!previous) return { previous };

      const target = previous.find((lead) => lead.stageId === stageId)?.stage;
      queryClient.setQueryData<Lead[]>(
        leadsKey,
        previous.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                stageId,
                stage: target ?? lead.stage,
                stageEnteredAt: new Date().toISOString(),
                status: target?.status ?? lead.status,
              }
            : lead,
        ),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(leadsKey, context.previous);
      toast.error(getApiErrorMessage(error, t("Could not move the lead")), {
        id: "pipeline-lead-move",
      });
    },
    onSuccess: (_result, variables) => {
      if (variables.stageName) {
        // Single braces: this app runs i18next with the ICU format, where
        // `{{stage}}` is not a placeholder and rendered literally.
        toast.success(t("Moved to {stage}", { stage: variables.stageName }), {
          id: "pipeline-lead-move",
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all() });
    },
  });
}

export function useCloseLeadMutation() {
  return usePipelineMutation<{ leadId: string; input: CloseLeadInput }, unknown>({
    mutationFn: ({ leadId, input }) => api.closeLead(leadId, input),
    success: (t, _result, variables) =>
      variables.input.status === "WON" ? t("Lead marked won") : t("Lead marked lost"),
    errorFallback: (t) => t("Could not close the lead"),
    toastId: "pipeline-lead-close",
  });
}

export function useReopenLeadMutation() {
  return usePipelineMutation<string, unknown>({
    mutationFn: api.reopenLead,
    success: (t) => t("Lead reopened"),
    errorFallback: (t) => t("Could not reopen the lead"),
    toastId: "pipeline-lead-reopen",
  });
}

export function useBulkUpdateLeadsMutation() {
  return usePipelineMutation<BulkUpdateLeadsInput, unknown>({
    mutationFn: api.bulkUpdateLeads,
    success: (t, _result, variables) =>
      t("{total} leads updated", { total: variables.leadIds.length }),
    errorFallback: (t) => t("Could not update the selected leads"),
    toastId: "pipeline-lead-bulk",
  });
}

export function useCreateLeadNoteMutation() {
  return usePipelineMutation<{ leadId: string; text: string }, unknown>({
    mutationFn: ({ leadId, text }) => api.createLeadNote(leadId, text),
    success: (t) => t("Note saved"),
    errorFallback: (t) => t("Could not save the note"),
    toastId: "pipeline-note-create",
  });
}

export function useDeleteLeadNoteMutation() {
  return usePipelineMutation<string, unknown>({
    mutationFn: api.deleteLeadNote,
    errorFallback: (t) => t("Could not delete the note"),
    toastId: "pipeline-note-delete",
  });
}

export function useCreateLeadTaskMutation() {
  return usePipelineMutation<{ leadId: string; input: CreateTaskInput }, unknown>({
    mutationFn: ({ leadId, input }) => api.createLeadTask(leadId, input),
    success: (t) => t("Next activity scheduled"),
    errorFallback: (t) => t("Could not schedule the activity"),
    toastId: "pipeline-task-create",
  });
}

export function useUpdateLeadTaskMutation() {
  return usePipelineMutation<{ taskId: string; input: UpdateTaskInput }, unknown>({
    mutationFn: ({ taskId, input }) => api.updateLeadTask(taskId, input),
    errorFallback: (t) => t("Could not update the activity"),
    toastId: "pipeline-task-update",
  });
}

export function useDeleteLeadTaskMutation() {
  return usePipelineMutation<string, unknown>({
    mutationFn: api.deleteLeadTask,
    errorFallback: (t) => t("Could not delete the activity"),
    toastId: "pipeline-task-delete",
  });
}

export function useUpdateTeamPipelineDefaultMutation() {
  return usePipelineMutation<{ teamId: string; input: UpdateTeamDefaultInput }, unknown>({
    mutationFn: ({ teamId, input }) => api.updateTeamPipelineDefault(teamId, input),
    success: (t) => t("Team pipeline updated"),
    errorFallback: (t) => t("Could not update the team's pipeline"),
    toastId: "pipeline-team-default",
  });
}

/**
 * Where a contact sits on the org's board. Enabled only when the caller has the
 * pipeline feature — the endpoint is behind `requireFeature`, so asking without
 * it would 403 and raise a toast on a screen that never mentioned pipelines.
 */
export function useContactStageQuery(contactId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: pipelineKeys.contactStage(contactId),
    queryFn: () => api.fetchContactStage(contactId!),
    enabled: Boolean(contactId) && enabled,
  });
}

export function useSetContactStageMutation(contactId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stageId: string) => api.setContactStage(contactId!, stageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.contactStage(contactId) });
      // The board and its counts have moved too.
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all() });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not set the stage"));
    },
  });
}

/**
 * Assign a stage to a contact named at call time — the contact form's path,
 * where the id only exists once the contact has been created.
 */
export function useAssignContactStageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, stageId }: { contactId: string; stageId: string }) =>
      api.setContactStage(contactId, stageId),
    onSuccess: (_data, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.contactStage(contactId) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all() });
    },
    onError: (error) => {
      // The contact itself saved; only the stage did not. Say so rather than
      // letting the modal close as if everything worked.
      toast.error(getApiErrorMessage(error, "Contact saved, but the stage was not applied"));
    },
  });
}

/**
 * Bulk assign from the contacts table. Invalidates the contacts list too, since
 * the stage column reads from the same leads.
 */
export function useBulkSetContactStageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactIds, stageId }: { contactIds: string[]; stageId: string }) =>
      api.bulkSetContactStage(contactIds, stageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all() });
      queryClient.invalidateQueries({ queryKey: contactKeys.all() });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not assign the stage"));
    },
  });
}

/** Destructive: deletes the lead and everything on it. Confirm before calling. */
export function useClearContactStageMutation(contactId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.clearContactStage(contactId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.contactStage(contactId) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all() });
      toast.success("Removed from the board");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not remove from the board"));
    },
  });
}
