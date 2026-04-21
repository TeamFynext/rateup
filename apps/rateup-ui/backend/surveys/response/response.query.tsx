import { useContext } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
    mutationFn: () => resetResponsesStats(surveyId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["responses"] });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });

      toast.success(
        response?.success ? "Cleaned up responses & Stats" : "Please try again",
        {
          id: "load-data",
        },
      );
      response?.success && close();
      setIsLoading(false);
    },
    onError: (error) => {
      console.error("Error Reseting", error.message);
      toast.error(error.message, {
        id: "load-data",
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

      toast.success(
        response?.success
          ? "Deleted Response successfully"
          : "Please try again",
        {
          id: "load-data",
        },
      );
      response?.success && close();
      setIsDeleting(false);
    },
    onError: (error) => {
      console.error("Error Deleting", error.message);
      toast.error(error.message, {
        id: "load-data",
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

      toast.success("Generate Response successfully", {
        id: "generateResponse",
      });
    },
    onError: (error) => {
      toast.error(error?.message ?? "An error occurred", {
        id: "generateResponse",
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
      toast.success("Downloaded Response successfully", {
        id: "downloadExcel",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Try again after some time", {
        id: "downloadExcel",
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
      toast.success("Contacts exported successfully", {
        id: "export-contacts",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Contacts export failed", {
        id: "export-contacts",
      });
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
