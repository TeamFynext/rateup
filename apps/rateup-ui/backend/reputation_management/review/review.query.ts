import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteAllReviews, getReviewsWithAnalysis } from "./review.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";

export const useReviewsWithAnalysis = (teamId: string) =>
  useQuery({
    queryKey: ["reviews", teamId],
    queryFn: () => getReviewsWithAnalysis(teamId),
    enabled: !!teamId,
    staleTime: 1000 * 60 * 3,
  });

export const useDeleteAllReviews = (teamId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAllReviews(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", teamId] });
      showSuccessToast("Deleted all reviews");
    },
    onError: (error) => {
      console.error(error);
      showErrorToast("Failed to delete reviews");
    },
  });
};
