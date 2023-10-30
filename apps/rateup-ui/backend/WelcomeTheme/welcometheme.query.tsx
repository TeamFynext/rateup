import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWelcomeTheme,
  getPublicwelcomeTheme,
  getWelcomeThemeBySurveyId,
  updateWelcomeTheme,
} from "./welcometheme.api";

import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
type MyProps = {
  // setIsCreating: React.Dispatch<React.SetStateAction<Boolean>>;
  setIsLoading: React.Dispatch<React.SetStateAction<Boolean>>;
  setSaveLoading: React.Dispatch<React.SetStateAction<Boolean>>;
};

//---------create welcome theme ------------
export const useCreateWelcomeThemeMutation = ({
  setIsLoading,
  setSaveLoading,
}: MyProps) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createWelcomeTheme,
    onSuccess: () => {
      notifications.update({
        id: "create-survey-welcome",
        color: "teal",
        title: "Success",
        loading: false,
        message: "theme Created...!",
        icon: <IconCheck size="1rem" />,
        autoClose: 2000,
      });
      queryClient.invalidateQueries({ queryKey: ["surveyWelcomeTheme"] });
      setSaveLoading(false);

      setIsLoading(false);
    },
    onError: (error: any) => {
      notifications.show({
        id: "create-survey-welcome",
        color: "red",
        title: "Failed",
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      setSaveLoading(false);
    },
  });

  return createMutation;
};

//----------update welcome theme -------------
export function useUpdateWelcomeTheme({
  setIsLoading,
  setSaveLoading,
}: MyProps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => updateWelcomeTheme(data),
    onSuccess: () => {
      notifications.update({
        id: "load-data",
        color: "teal",
        title: "Success",
        loading: false,
        message: "theme Updated Successfully!",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      setSaveLoading(false);
      setIsLoading(false);
      queryClient.invalidateQueries({ queryKey: ["surveyWelcomeTheme"] });
    },
    onError: (error: any) => {
      console.error("Error Survey Update:", error.message);
      notifications.update({
        id: "load-data",
        color: "red",
        title: "Failed",
        loading: false,
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });

      setSaveLoading(false);
      setIsLoading(false);
    },
  });
}
//--------getsaved styles with surveyid----------------
export const useWelcomeThemeBySurveyId = (surveyId: string) =>
  useQuery({
    enabled: !!surveyId,
    queryKey: ["surveyWelcomeTheme", surveyId],
    queryFn: () => getWelcomeThemeBySurveyId(surveyId),
  });

//--------public------------
export const usePublicWelcomeThemeBySurveyId = (welcomeThemeId: string) =>
  useQuery({
    enabled: !!welcomeThemeId,
    queryKey: ["public-surveywelcometheme", welcomeThemeId],
    queryFn: () => getPublicwelcomeTheme(welcomeThemeId),
  });
