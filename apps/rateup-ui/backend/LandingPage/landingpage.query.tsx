import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getPublicLandingPageSurveys } from "./landingpage.api";

export const usePublicLandingPageSurveys = (landingPageId: string) =>
  useQuery({
    enabled: !!landingPageId,
    queryKey: ["public-survey", landingPageId],
    queryFn: () => getPublicLandingPageSurveys(landingPageId),
  });
