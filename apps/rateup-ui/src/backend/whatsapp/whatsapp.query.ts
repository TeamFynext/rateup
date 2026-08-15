import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { whatsappKeys } from "@/backend/whatsapp/whatsapp.keys";
import type { NewPendingMessage } from "@/store/pendingMessages.ts";
import { usePendingSend } from "@/store/pendingMessages.ts";
import type { RequestPayload } from "@/types/api.ts";
import type { WaTemplateComponent } from "@/types/global";

import type { SyncTemplatesInput } from "./whatsapp.api";
import {
  createWaTemplate,
  deleteWaTemplate,
  getShareUrlFromSurveyTeamMapId,
  getUnregisteredTemplates,
  getWaTemplateById,
  getWaTemplates,
  registerTemplates,
  saveTemplateAsDraft,
  sendWaTemplateToUser,
  syncTemplates,
  updateWaTemplate,
} from "./whatsapp.api";

export const useWaTemplates = (templateType?: string) =>
  useQuery({
    queryKey: whatsappKeys.templatesByType(templateType),
    queryFn: () => getWaTemplates(templateType),
  });

export const useWaTemplateById = (id: string) =>
  useQuery({
    enabled: !!id,
    queryKey: whatsappKeys.template(id),
    queryFn: () => getWaTemplateById(id),
  });

export const useCreateTemplateMutation = (onSuccess: () => void, onError: () => void) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (templateData: RequestPayload) => createWaTemplate(templateData),
    onSuccess: () => {
      toast.success("Template Created Successfully");
      queryClient.invalidateQueries({ queryKey: whatsappKeys.templates() });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating template!");
      onError();
    },
  });

  return createMutation;
};

export const useSaveTemplateAsDraftMutation = (
  id: string,
  onSuccess: (data: unknown) => void,
  onError: () => void,
) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (templateData: RequestPayload) => saveTemplateAsDraft(templateData),
    onSuccess: (data) => {
      toast.success("Template Saved as Draft Successfully");
      queryClient.invalidateQueries({ queryKey: whatsappKeys.templates() });
      queryClient.invalidateQueries({ queryKey: whatsappKeys.template(id) });
      onSuccess(data);
    },
    onError: (error) => {
      toast.error(error?.message || "Error saving as draft template!");
      onError();
    },
  });

  return createMutation;
};
export const useUpdateTemplateMutation = (
  id: string,
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({
      templateId,
      templateData,
    }: {
      templateId: string;
      templateData: RequestPayload;
    }) => updateWaTemplate(templateId, templateData),
    onSuccess: () => {
      toast.success("Template Updated Successfully");
      queryClient.invalidateQueries({ queryKey: whatsappKeys.templates() });
      queryClient.invalidateQueries({ queryKey: whatsappKeys.template(id) });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating template!");
      onError?.();
    },
  });
  return updateMutation;
};

export const useDeleteWaTemplateMutation = (onSuccess?: () => void, onError?: () => void) => {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteWaTemplate,
    onSuccess: () => {
      toast.success("Template Deleted Successfully", {
        id: "template-delete",
      });
      queryClient.invalidateQueries({ queryKey: whatsappKeys.templates() });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error deleting template!", {
        id: "template-delete",
      });
      onError?.();
    },
  });
  return deleteMutation;
};

export const useSyncTemplatesMutation = (onSuccess?: () => void, onError?: () => void) => {
  const queryClient = useQueryClient();
  const syncMutation = useMutation({
    mutationFn: (data?: SyncTemplatesInput) => syncTemplates(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.templates() });
      toast.success("Templates Synced Successfully");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error syncing templates!");
      onError?.();
    },
  });
  return syncMutation;
};

export const useUnregisteredTemplates = (enabled: boolean) =>
  useQuery({
    enabled: enabled,
    queryKey: whatsappKeys.unregisteredTemplates(),
    queryFn: getUnregisteredTemplates,
  });

export const useRegisterTemplatesMutation = (onSuccess?: () => void, onError?: () => void) => {
  const queryClient = useQueryClient();
  const registerMutation = useMutation({
    mutationFn: registerTemplates,
    onSuccess: () => {
      toast.success("Templates synced successfully");
      queryClient.invalidateQueries({ queryKey: whatsappKeys.templates() });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error syncing templates!");
      onError?.();
    },
  });
  return registerMutation;
};

/**
 * @param rowKey thread the template is going to, so the card it will become shows
 *   there while the send is in flight.
 */
export const useSendWaTemplateToUser = (
  phone: string,
  contactId: string | undefined,
  rowKey?: string,
) => {
  const queryClient = useQueryClient();
  const pending = usePendingSend(rowKey, contactId);
  return useMutation({
    mutationFn: ({
      templateId,
      parameterData,
      teamId,
      whatsappSettingsPhoneId,
    }: {
      templateId: string;
      parameterData: WaTemplateComponent[];
      teamId: string;
      whatsappSettingsPhoneId: string;
      /** The card to draw while this is in flight; not part of the request. */
      pending?: NewPendingMessage;
    }) => sendWaTemplateToUser(templateId, phone, parameterData, teamId, whatsappSettingsPhoneId),
    onMutate: (variables) => ({ pendingId: pending.begin(variables.pending) }),
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.contacts() });
      queryClient.invalidateQueries({ queryKey: whatsappKeys.contact(contactId) });
      toast.success("Template sent successfully");
      // Invalidates the thread itself, then takes the pending card back down.
      return pending.settle(context?.pendingId);
    },
    onError: (error, _variables, context) => {
      pending.rollback(context?.pendingId);
      toast.error(error?.message || "Error sending template!");
    },
  });
};

export const useWaShareUrl = (surveyTeamMapShortId: string) =>
  useQuery({
    enabled: !!surveyTeamMapShortId,
    queryKey: whatsappKeys.shareUrl(surveyTeamMapShortId),
    queryFn: () => getShareUrlFromSurveyTeamMapId(surveyTeamMapShortId),
  });
