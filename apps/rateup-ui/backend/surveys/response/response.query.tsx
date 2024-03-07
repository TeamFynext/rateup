import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteResponse,
  downloadExcelResponse,
  downloadExcelResponseType,
  generateResponse,
  getAllResponses,
  getResponses,
  resetResponsesStats,
  syncResponseToGoogleSheet,
} from "./response.api";
import { notifications } from "@mantine/notifications";
import { decryptPrivateKey, passwordToKey } from "../../../utils/encryption";
import { decryptResultResponse } from "../../../utils/response";
import { useSurvey } from "../surveys.query";
import { useUser } from "../../../context/UserContext";
import { useContext } from "react";
import SurveyContext from "../../../context/SurveyContext";

export const useResponses = (surveyTeamMapId: string) =>
  useQuery({
    queryKey: ["responses", surveyTeamMapId],
    queryFn: () => getResponses(surveyTeamMapId),
    enabled: !!surveyTeamMapId,
  });

export const useAllResponses = (surveyId: string) => {
  const { data: survey } = useSurvey(surveyId);
  const { user } = useUser();
  const { encryptionpassword: passkey } = useContext(SurveyContext);
  return useQuery({
    queryKey: ["allresponses", survey?.id],
    queryFn: async () => {
      let response = await getAllResponses(survey?.id);
      if (passkey) {
        const { decryptedResponses } = await decryptResultResponse(
          response,
          user?.encryptionKeys?.privateKey,
          user?.encryptionKeys?.publicKey,
          passkey,
        );
        response = decryptedResponses;
      }
      return response;
    },
    enabled: !!survey?.id && (survey.isEncrypted ? !!passkey : true),
    refetchOnWindowFocus: "always",
  });
};

export function useResetResponsesStats(
  surveyId: string,
  surveyTeamMapId: string,
  close: () => void,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resetResponsesStats(surveyTeamMapId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["responses"] });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });

      notifications.update({
        id: "load-data",
        loading: false,
        color: response?.success ? "green" : "red",
        title: response?.success ? "Reset Success" : "Failed Reset",
        message: response?.success
          ? "Cleaned up responses & Stats"
          : "Please try again",
        icon: response?.success ? (
          <IconCheck size="1rem" />
        ) : (
          <IconX size="1rem" />
        ),
        autoClose: 3000,
      });
      response?.success && close();
      setIsLoading(false);
    },
    onError: (error: any) => {
      console.error("Error Reseting", error.message);
      notifications.update({
        id: "load-data",
        color: "red",
        loading: false,
        title: "Failed Reset",
        message: error.message,
        icon: <IconX size="1rem" />,
        autoClose: 3000,
      });
      setIsLoading(false);
    },
  });
}

export function useDeleteResponse(
  surveyId: string,
  surveyTeamMapId: string,
  close: () => void,
  setIsDeleting: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteResponse(id, surveyTeamMapId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["responses"] });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["allresponses", surveyId] });

      notifications.update({
        id: "load-data",
        loading: false,
        color: response?.success ? "green" : "red",
        title: response?.success ? "Delete Success" : "Failed Delete",
        message: response?.success
          ? "Deleted Response successfully"
          : "Please try again",
        icon: response?.success ? (
          <IconCheck size="1rem" />
        ) : (
          <IconX size="1rem" />
        ),
        autoClose: 3000,
      });
      response?.success && close();
      setIsDeleting(false);
    },
    onError: (error: any) => {
      console.error("Error Deleting", error.message);
      notifications.update({
        id: "load-data",
        color: "red",
        loading: false,
        title: "Failed Delete",
        message: error.message,
        icon: <IconX size="1rem" />,
        autoClose: 3000,
      });
      setIsDeleting(false);
    },
  });
}

export function useGenerateResponse(surveyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { surveyTeamMapId: string; batchSize: number }) =>
      generateResponse(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["responses"] });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["allresponses", surveyId] });

      notifications.update({
        id: "generateResponse",
        loading: false,
        color: "green",
        title: "Response Generate Success",
        message: "Generate Response successfully",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
    onError: (error: any) => {
      notifications.update({
        id: "generateResponse",
        color: "red",
        loading: false,
        title: "Failed Response Generate",
        message: error?.response?.data?.message ?? error?.response?.data,
        icon: <IconX size="1rem" />,
        autoClose: 3000,
      });
    },
  });
}

export function useSyncResponseToGoogleSheet(surveyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncResponseToGoogleSheet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
    },
  });
}

export function useDownloadExcelResponse() {
  return useMutation({
    mutationFn: (data: downloadExcelResponseType) =>
      downloadExcelResponse(data),
    onSuccess: (response) => {
      notifications.show({
        id: "downloadExcel",
        loading: false,
        color: "green",
        title: "Response Download Success",
        message: "Downloaded Response successfully",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
    onError: (error: any) => {
      notifications.show({
        id: "downloadExcel",
        color: "red",
        loading: false,
        title: "Failed Response Downloading",
        message: error?.response?.data?.message ?? error?.response?.data,
        icon: <IconX size="1rem" />,
        autoClose: 3000,
      });
    },
  });
}
