import { Toast } from "@/components/common/Notice";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getWaSettings, getWaTemplates, sendWaTemplateToUser } from "./whatsapp.api";

export const useWaTemplates = (templateType?: any) =>
  useQuery({
    queryKey: ["watemplates", templateType],
    queryFn: () => getWaTemplates(templateType),
  });

export const useSendWaTemplateToUser = (phone: string, _contactId?: string) => {
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
      Toast.show({
        type: "success",
        text1: "Template sent successfully",
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",

        text1:
          typeof error?.response?.data === "string"
            ? error?.response?.data
            : "Error sending template!",
      });
    },
  });
};

export const useWaSettings = (enabled = true) =>
  useQuery({
    queryKey: ["waSettings"],
    queryFn: getWaSettings,
    enabled,
  });
