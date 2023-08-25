import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getPublicLandingPage, getPublicLandingPageSurveys } from "./landingpage.api";

export const usePublicLandingPageSurveys = (landingPageId: string) =>
  useQuery({
    enabled: !!landingPageId,
    queryKey: ["public-survey", landingPageId],
    queryFn: () => getPublicLandingPageSurveys(landingPageId),
  });
export const usePublicLandingPage = (landingPageId: string) =>
  useQuery({
    enabled: !!landingPageId,
    queryKey: ["public-landingpage", landingPageId],
    queryFn: () => getPublicLandingPage(landingPageId),
  });
