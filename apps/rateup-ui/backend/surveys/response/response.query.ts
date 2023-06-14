import { useQuery } from "@tanstack/react-query";
import { getResponses } from "./response.api";

export const useResponses = (surveyId: string) => useQuery({
  queryKey: ["responses", surveyId],
  queryFn: () => getResponses(surveyId),
});