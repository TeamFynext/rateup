import { useQuery } from "@tanstack/react-query";
import { getSurveys } from "./survey.api";

export const useSurveys = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["surveys"],
    queryFn: getSurveys,
    enabled,
  });
};