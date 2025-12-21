import { useContext } from "react";

import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import SurveyContext from "../../../context/SurveyContext";
import { useUser } from "../../../context/UserContext";
import { decryptResultResponse } from "../../../utils/response";
import { useSurvey } from "../surveys.query";
import {
  deleteResponse,
  downloadExcelResponse,
  downloadExcelResponseType,
  exportContactResponseToContacts,
  generateResponse,
  getAllResponses,
  getHappyIndex,
  getLargeTextResponseSummaryByAI,
  getResponseForComparison,
  getResponses,
  getResponsesBySurveyId,
  getSurveyHappyResponseAnalytics,
  getSurveyResponseAnalytics,
  getSurveyResponseCount,
  resetResponsesStats,
  syncResponseToGoogleSheet,
} from "./response.api";

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

export const useResponsesBySurvey = (surveyId, filter) => {
  const filterQuery = Object.entries(filter)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return useQuery({
    queryFn: () => getResponsesBySurveyId(surveyId, filterQuery),
    queryKey: ["response", "survey", surveyId, filter],
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

export function useDeleteResponse(surveyId: string, surveyTeamMapId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string[]) => deleteResponse(id, surveyTeamMapId),
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
        message: "Try again after some time",
        icon: <IconX size="1rem" />,
        autoClose: 3000,
      });
    },
  });
}

export function useGenerateLargeTextResponseSummaryByAI(surveyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: getLargeTextResponseSummaryByAI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["questions", surveyId] });
    },
  });
}

export const useExportContactResponses = (surveyId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => exportContactResponseToContacts(surveyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({
        queryKey: ["campaignContactGroupsData"],
      });
      showSuccessToast(
        "Contacts exported successfully",
        "export-contacts",
        <IconCheck />,
        true,
      );
    },
    onError: () => {
      showErrorToast(
        "Contacts export failed",
        "export-contacts",
        <IconX />,
        true,
      );
    },
  });
};

export const useResponseCount = (surveyId) => {
  return useQuery({
    queryFn: () => getSurveyResponseCount(surveyId),
    queryKey: ["responseCount", surveyId],
    enabled: !!surveyId,
  });
};

type FilterAnalytics = {
  teamMapIds?: string[];
  dateRange?: string[];
};
export const useResponseAnalytics = (surveyId, filter: FilterAnalytics) => {
  const filterQuery = Object.entries(filter)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return useQuery({
    queryFn: () => getSurveyResponseAnalytics(surveyId, filterQuery),
    queryKey: ["responnseAnalytics", surveyId, filter],
    enabled: !!surveyId,
  });
};

export const useResponseForComparison = (surveyId) => {
  return useQuery({
    queryFn: () => getResponseForComparison(surveyId),
    queryKey: ["responseComparison", surveyId],
    enabled: !!surveyId,
  });
};

export function useSurveyHappyResponseAnalytics(
  surveyId: string,
  timeFilter?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["survey-happy-response-analytics", surveyId, timeFilter],
    queryFn: () =>
      getSurveyHappyResponseAnalytics(surveyId, `timeFilter=${timeFilter}`),
    enabled: !!surveyId && enabled,
  });
}

export function useHappyIndex(surveyId: string, filterTeams) {
  return useQuery({
    queryKey: ["happy-index", surveyId, filterTeams],
    queryFn: () => getHappyIndex(surveyId, filterTeams),
    enabled: !!surveyId,
  });
}
