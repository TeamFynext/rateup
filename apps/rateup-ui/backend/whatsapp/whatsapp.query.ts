import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "../../utils";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";
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
      showSuccessToast("Template Created Successfully");
      queryClient.invalidateQueries({ queryKey: ["watemplates"] });
      onSuccess();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error creating template!"),
      );
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
      showSuccessToast("Template Saved as Draft Successfully");
      queryClient.invalidateQueries({ queryKey: ["watemplates"] });
      queryClient.invalidateQueries({ queryKey: ["watemplate", id] });
      onSuccess();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error saving as draft template!"),
      );
      onError();
    },
  });

  return createMutation;
};
export const useUpdateTemplateMutation = (id, onSuccess?, onError?) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({ templateId, templateData }: any) =>
      updateWaTemplate(templateId, templateData),
    onSuccess: () => {
      showSuccessToast("Template Updated Successfully");
      queryClient.invalidateQueries({ queryKey: ["watemplates"] });
      queryClient.invalidateQueries({ queryKey: ["watemplate", id] });
      onSuccess?.();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error updating template!"),
      );
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
      showSuccessToast(
        "Template Deleted Successfully",
        "template-delete",
        null,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["watemplates"] });
      onSuccess?.();
    },
    onError: () => {
      showErrorToast("Error deleting template!", "template-delete", null, true);
      onError?.();
    },
  });
  return deleteMutation;
};

export const useSyncTemplatesMutation = (onSuccess?, onError?) => {
  const queryClient = useQueryClient();
  const syncMutation = useMutation({
    mutationFn: syncTemplates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watemplates"] });
      showSuccessToast("Templates Synced Successfully");
      onSuccess?.();
    },
    onError: () => {
      showErrorToast("Error syncing templates!");
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
      showSuccessToast("Templates synced successfully");
      queryClient.invalidateQueries({ queryKey: ["watemplates"] });
      onSuccess?.();
    },
    onError: () => {
      showErrorToast("Error syncing templates!");
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
    }) =>
      sendWaTemplateToUser(
        templateId,
        phone,
        parameterData,
        teamId,
        whatsappSettingsPhoneId,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa-messages", contactId] });
      queryClient.invalidateQueries({ queryKey: ["wa-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["wa-contact", contactId] });
      showSuccessToast("Template sent successfully");
    },
    onError: (error: any) => {
      showErrorToast(
        typeof error?.response?.data === "string"
          ? error?.response?.data
          : "Error sending template!",
      );
    },
  });
};

export const useWaShareUrl = (surveyTeamMapShortId: string) =>
  useQuery({
    enabled: !!surveyTeamMapShortId,
    queryKey: ["wa-share-url", surveyTeamMapShortId],
    queryFn: () => getShareUrlFromSurveyTeamMapId(surveyTeamMapShortId),
  });
