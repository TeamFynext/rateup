import { useQuery } from "@tanstack/react-query";
import { getReviewsWithAnalysis } from "./review.api";

export const useReviewsWithAnalysis = (teamId: string) =>
  useQuery({
    queryKey: ["reviews", teamId],
    queryFn: () => getReviewsWithAnalysis(teamId),
    enabled: !!teamId,
    staleTime: 1000 * 60 * 3,
  });
