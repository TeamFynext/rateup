import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteResponse,
  getResponses,
  resetResponsesStats,
} from "./response.api";
import { notifications } from "@mantine/notifications";

export const useResponses = (surveyId: string) =>
  useQuery({
    queryKey: ["responses", surveyId],
    queryFn: () => getResponses(surveyId),
  });

export function useResetResponsesStats(
  surveyId: string,
  close: () => void,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resetResponsesStats(surveyId),
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
  close: () => void,
  setIsDeleting: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteResponse(id, surveyId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["responses"] });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });

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
