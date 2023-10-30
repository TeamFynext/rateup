import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPublicLandingPage,
  getPublicLandingPageSurveys,
  updateLandingPage,
} from "./landingpage.api";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";

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

//------------edit/ update landing page -------------
export function useEditLandingPageMutation(id, setIsLoading) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => updateLandingPage(id, data),
    onSuccess: () => {
      notifications.show({
        id: "load-data",
        color: "teal",
        title: "Success",
        message: "Survey Updated Successfully!",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      setIsLoading(false);
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["survey"] });
    },
    onError: (error: any) => {
      console.error("Error Survey Update:", error.message);
      notifications.show({
        id: "load-data",
        color: "red",
        title: "Failed",
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });

      setIsLoading(false);
    },
  });
}
