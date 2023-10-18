import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWaTemplate,
  deleteWaTemplate,
  getUnregisteredTemplates,
  getWaTemplates,
  registerTemplates,
  syncTemplates,
  updateWaTemplate,
} from "./whatsapp.api";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";

export const useWaTemplates = () =>
  useQuery({
    queryKey: ["watemplates"],
    queryFn: async () => await getWaTemplates(),
  });

export const useCreateTemplateMutation = (onSuccess, onError) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (templateData: any) => createWaTemplate(templateData),
    onSuccess: () => {
      showSuccessToast("Template Created Successfully");
      queryClient.invalidateQueries(["watemplates"]);
      onSuccess();
    },
    onError: () => {
      showErrorToast("Error creating template!");
      onError();
    },
  });

  return createMutation;
};

export const useUpdateTemplateMutation = (onSuccess?, onError?) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: ({ templateId, templateData }: any) =>
      updateWaTemplate(templateId, templateData),
    onSuccess: () => {
      showSuccessToast("Template Updated Successfully");
      queryClient.invalidateQueries(["watemplates"]);
      onSuccess?.();
    },
    onError: () => {
      showErrorToast("Error updating template!");
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
      showSuccessToast("Template Deleted Successfully");
      queryClient.invalidateQueries(["watemplates"]);
      onSuccess?.();
    },
    onError: () => {
      showErrorToast("Error deleting template!");
      onError?.();
    },
  });
  return deleteMutation;
};

export const useSyncTemplatesMutation = (onSuccess?, onError?) => {
  const syncMutation = useMutation({
    mutationFn: syncTemplates,
    onSuccess: () => {
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
      queryClient.invalidateQueries(["watemplates"]);
      onSuccess?.();
    },
    onError: () => {
      showErrorToast("Error syncing templates!");
      onError?.();
    },
  });
  return registerMutation;
};
