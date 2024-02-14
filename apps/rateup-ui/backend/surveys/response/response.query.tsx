import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteResponse,
  generateResponse,
  getAllResponses,
  getResponses,
  resetResponsesStats,
} from "./response.api";
import { notifications } from "@mantine/notifications";

export const useResponses = (surveyTeamMapId: string) =>
  useQuery({
    queryKey: ["responses", surveyTeamMapId],
    queryFn: () => getResponses(surveyTeamMapId),
    enabled: !!surveyTeamMapId,
  });

export const useAllResponses = (surveyId: string) =>
  useQuery({
    queryKey: ["allresponses", surveyId],
    queryFn: () => getAllResponses(surveyId),
    enabled: !!surveyId,
  });

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
    mutationFn: (data: { surveyId: string; batchSize: number }) =>
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
        message: error.message,
        icon: <IconX size="1rem" />,
        autoClose: 3000,
      });
    },
  });
}
