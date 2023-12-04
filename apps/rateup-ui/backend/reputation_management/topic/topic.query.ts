import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTopic, deleteTopic, getTopics, updateTopic } from "./topic.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";

export const useRMTopics = (teamId: string) =>
  useQuery({
    queryKey: ["topics", teamId],
    queryFn: () => getTopics(teamId),
    enabled: !!teamId,
    staleTime: Infinity,
  });
export const useCreateRMTopicMutation = (teamId: string) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createTopic,
    onSuccess: () => {
      showSuccessToast("Topic created successfully");
      queryClient.invalidateQueries({
        queryKey: ["topics", teamId],
      });
    },
    onError: () => {
      showErrorToast("Error creating topic");
    },
  });

  return createMutation;
};

export const useDeleteRMTopicMutation = (teamId: string) => {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteTopic,
    onSuccess: () => {
      showSuccessToast("Topic deleted successfully");
      queryClient.invalidateQueries({
        queryKey: ["topics", teamId],
      });
    },
    onError: () => {
      showErrorToast("Error deleting topic");
    },
  });

  return deleteMutation;
};

export const useUpdateRMTopicMutation = (teamId: string) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: updateTopic,
    onSuccess: () => {
      showSuccessToast("Topic updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["topics", teamId],
      });
    },
    onError: () => {
      showErrorToast("Error updating topic");
    },
  });

  return updateMutation;
};
