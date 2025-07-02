import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getWaSettings,
  getWaTemplates,
  sendWaTemplateToUser,
} from "./whatsapp.api";
import { useToast } from "react-native-toast-notifications";

export const useWaTemplates = (templateType?: any) =>
  useQuery({
    queryKey: ["watemplates", templateType],
    queryFn: () => getWaTemplates(templateType),
  });

export const useSendWaTemplateToUser = (phone: string, contactId: string) => {
  const toast = useToast();
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
        whatsappSettingsPhoneId
      ),
    onSuccess: () => {
      toast.show("Template sent successfully", {
        type: "success",
      });
    },
    onError: (error: any) => {
      toast.show(
        typeof error?.response?.data === "string"
          ? error?.response?.data
          : "Error sending template!",
        {
          type: "danger",
        }
      );
    },
  });
};

export const useWaSettings = (enabled = true) =>
  useQuery({
    queryKey: ["waSettings"],
    queryFn: getWaSettings,
    enabled,
  });
