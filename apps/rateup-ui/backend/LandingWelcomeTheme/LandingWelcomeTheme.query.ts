import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createLandingWelcomeTheme, getLandingWelcomeThemeByLandingId, getPublicLandingWelcomeThemeByLandingId, updateLandingWelcomeTheme,  } from "./LandingWelcomeTheme.api";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";

type MyProps = {
  // setIsCreating: React.Dispatch<React.SetStateAction<Boolean>>;
  setIsLoading: React.Dispatch<React.SetStateAction<Boolean>>;
  setSaveLoading: React.Dispatch<React.SetStateAction<Boolean>>;
};

//---------create welcome theme ------------
export const useCreateLandingWelcomeThemeMutation = ({ setIsLoading,setSaveLoading }: MyProps) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createLandingWelcomeTheme,
    onSuccess: () => {
      notifications.update({
        id: "create-landing-welcome",
        color: "teal",
        title: "Success",
        message: "theme Created...!",
        loading: false,
        // icon: <IconCheck size="1rem" />,
        autoClose: 2000
      });
      queryClient.invalidateQueries(["landingWelcomeTheme"]);
      setSaveLoading(false);

      setIsLoading(false);
    },
    onError: (error: any) => {
      notifications.show({
        id: "create-landing-welcome",
        color: "red",
        title: "Failed",
        message: error?.response?.data?.message,
        // icon: <Icon,
        autoClose: 3000,
      });
      setSaveLoading(false);
    },
  });

  return createMutation;
};

//----------update welcome theme -------------
export function useUpdateLandingWelcomeTheme({ setIsLoading,setSaveLoading}:MyProps) {
  const queryClient = useQueryClient();

  return useMutation((data: any) => updateLandingWelcomeTheme(data), {
    onSuccess: () => {
      notifications.update({
        id: "load-data",
        color: "teal",
        title: "Success",
        loading: false,
        message: "theme Updated Successfully!",
        // icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      setSaveLoading(false);
      setIsLoading(false);
      queryClient.invalidateQueries(["LandingWelcomeTheme"]);
    },
    onError: (error: any) => {
      console.error("Error landing theme Update:", error.message);
      notifications.update({
        id: "load-data",
        color: "red",
        title: "Failed",
        loading: false,
        message: error?.response?.data?.message,
        // icon: <IconCheck size="1rem" />,
        autoClose: 3000
      });

      setSaveLoading(false);
      setIsLoading(false);
    },
  });
}
//--------getsaved styles with landingid----------------
export const uselandingWelcomeThemeByLandingId = (landingId: string) =>
  useQuery({
    enabled: !!landingId,
    queryKey: ["landingWelcomeTheme", landingId],
    queryFn: () => getLandingWelcomeThemeByLandingId
    (landingId),
  });

  //--------public------------
  export const usePublicWelcomeThemeByLandingId = (welcomeThemeId: string) =>
  useQuery({
    enabled: !!welcomeThemeId,
    queryKey: ["public-landing-welcometheme", welcomeThemeId],
    queryFn: () => getPublicLandingWelcomeThemeByLandingId(welcomeThemeId),
  });
