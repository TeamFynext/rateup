import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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

export const useWaTemplates = (templateType?) =>
  useQuery({
    queryKey: ["watemplates", templateType],
    queryFn: () => getWaTemplates(templateType),
  });

export const useWaTemplateById = (id: string) =>
  useQuery({
    enabled: !!id,
    queryKey: ["watemplate", id],
    queryFn: () => getWaTemplateById(id),
  });

export const useCreateTemplateMutation = (onSuccess, onError) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (templateData: any) => createWaTemplate(templateData),
    onSuccess: () => {
      toast.success("Template Created Successfully");
      queryClient.invalidateQueries({ queryKey: ["watemplates"] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating template!");
      onError();
    },
  });

  return createMutation;
};

export const useSaveTemplateAsDraftMutation = (id, onSuccess, onError) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (templateData: any) => saveTemplateAsDraft(templateData),
    onSuccess: () => {
      toast.success("Template Saved as Draft Successfully");
      queryClient.invalidateQueries({ queryKey: ["watemplates"] });
      queryClient.invalidateQueries({ queryKey: ["watemplate", id] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error?.message || "Error saving as draft template!");
      onError();
    },
  });

  return createMutation;
};
export const useUpdateTemplateMutation = (id, onSuccess?, onError?) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({ templateId, templateData }: any) => updateWaTemplate(templateId, templateData),
    onSuccess: () => {
      toast.success("Template Updated Successfully");
      queryClient.invalidateQueries({ queryKey: ["watemplates"] });
      queryClient.invalidateQueries({ queryKey: ["watemplate", id] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating template!");
      onError?.();
    },
  });
  return updateMutation;
};

export const useDeleteWaTemplateMutation = (onSuccess?, onError?) => {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteWaTemplate,
    onSuccess: () => {
      toast.success("Template Deleted Successfully", {
        id: "template-delete",
      });
      queryClient.invalidateQueries({ queryKey: ["watemplates"] });
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

export const useSyncTemplatesMutation = (onSuccess?, onError?) => {
  const queryClient = useQueryClient();
  const syncMutation = useMutation({
    mutationFn: (data?: SyncTemplatesInput) => syncTemplates(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watemplates"] });
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
    queryKey: ["waTemplates", "unregistered"],
    queryFn: getUnregisteredTemplates,
  });

export const useRegisterTemplatesMutation = (onSuccess?, onError?) => {
  const queryClient = useQueryClient();
  const registerMutation = useMutation({
    mutationFn: registerTemplates,
    onSuccess: () => {
      toast.success("Templates synced successfully");
      queryClient.invalidateQueries({ queryKey: ["watemplates"] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error syncing templates!");
      onError?.();
    },
  });
  return registerMutation;
};

export const useSendWaTemplateToUser = (phone: string, contactId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      parameterData,
      teamId,
      whatsappSettingsPhoneId,
    }: {
      templateId: string;
      parameterData: any;
      teamId: string;
      whatsappSettingsPhoneId: string;
    }) => sendWaTemplateToUser(templateId, phone, parameterData, teamId, whatsappSettingsPhoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa-messages", contactId] });
      queryClient.invalidateQueries({ queryKey: ["wa-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["wa-contact", contactId] });
      toast.success("Template sent successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error sending template!");
    },
  });
};

const useWaShareUrl = (surveyTeamMapShortId: string) =>
  useQuery({
    enabled: !!surveyTeamMapShortId,
    queryKey: ["wa-share-url", surveyTeamMapShortId],
    queryFn: () => getShareUrlFromSurveyTeamMapId(surveyTeamMapShortId),
  });
