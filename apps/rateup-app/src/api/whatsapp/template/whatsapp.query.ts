import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getWaSettings, getWaTemplates, sendWaTemplateToUser } from "./whatsapp.api";

export const useWaTemplates = (templateType?:any) =>
  useQuery({
    queryKey: ["watemplates", templateType],
    queryFn: () => getWaTemplates(templateType),
  });

export const useSendWaTemplateToUser = (phone: string, contactId: string) => {
  // const queryClient = useQueryClient();
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
      // queryClient.invalidateQueries({ queryKey: ["wa-messages", contactId] });
      // queryClient.invalidateQueries({ queryKey: ["wa-contacts"] });
      // queryClient.invalidateQueries({ queryKey: ["wa-contact", contactId] });
      console.log("Template sent successfully");
    },
    onError: (error: any) => {
       console.log(
        typeof error?.response?.data === "string"
          ? error?.response?.data
          : "Error sending template!",
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