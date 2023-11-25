import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cloneSurvey,
  createSurvey,
  createSurveyLandingPage,
  getPublicSurvey,
  getPublicSurveyGoogleLink,
  getSurvey,
  getLandingpage,
  getSurveyByLandingId,
  getSurveyLandings,
  getSurveys,
  getWhatsappSurveys,
  updateSurvey,
  updateSurveyCompleted,
  updateSurveyGoogleLink,
  updateSurveyPassword,
  updateSurveyStarted,
  updateSurveyVisited,
  verifySurveyPassword,
  updateSurveyLandingPage,
  getActiveSurveysSummary,
  deleteSurvey,
} from "./survey.api";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { getTeamSurveys } from "../team/team.api";
import { rem } from "@mantine/core";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";

export const useSurvey = (surveyId: string) => {
  return useQuery({
    queryKey: ["survey", surveyId],
    enabled: !!surveyId,
    queryFn: () => getSurvey(surveyId),
  });
};

//------------get landing page -----------
export const useLandingPage = (LandingpageId: string) =>
  useQuery({
    enabled: !!LandingpageId,
    queryKey: ["survey", LandingpageId],
    queryFn: () => getLandingpage(LandingpageId),
  });

export const useSurveysBylandingId = (landingId: string) =>
  useQuery({
    enabled: !!landingId,
    queryKey: ["landingSurveys", landingId],
    queryFn: () => getSurveyByLandingId(landingId),
  });

//------------whatsapp survey --------------
//----@author:harshad-----------

export const useWhatsappSurveys = (enabled) => {
  return useQuery({
    enabled: enabled,
    queryKey: ["whatsappsurveys"],
    queryFn: getWhatsappSurveys,
  });
};

export const usePublicSurvey = (surveyId: string) => {
  return useQuery({
    enabled: !!surveyId,
    queryKey: ["public-survey", surveyId],
    queryFn: () => getPublicSurvey(surveyId),
  });
};

export const usePublicSurveyGoogleLink = (surveyTeamMapId: string) =>
  useQuery({
    enabled: !!surveyTeamMapId,
    queryKey: ["public-survey-google-link", surveyTeamMapId],
    queryFn: () => getPublicSurveyGoogleLink(surveyTeamMapId),
  });

// export const useSurveys = (teamIsSelected) =>
//   useQuery({
//     enabled: !teamIsSelected,
//     queryKey: ["surveys"],
//     queryFn: getSurveys,
//   });
//--------------survey landing pages----------
export const useSurveysLanding = (teamIsSelected) =>
  useQuery({
    enabled: true,
    queryKey: ["surveysLanding"],
    queryFn: getSurveyLandings,
  });

// export function useSurveysLanding(queryClient) {
//   return useQuery(["surveysLanding"], getSurveyLandings, {
//     //refetchOnWindowFocus: "always",
//     //refetchOnMount: "always",
//     initialData: () => queryClient.getQueryData(["surveysLanding"]),
//     onSuccess: (data) => {},
//   });
// }
export const useSurveys = (specificTeamIsSelected: boolean) => {
  return useQuery({
    enabled: !specificTeamIsSelected,
    queryKey: ["surveys"],
    queryFn: getSurveys,
  });
};

export const useSurveysSummary = () => {
  return useQuery({
    queryKey: ["surveysSummary"],
    queryFn: getActiveSurveysSummary,
  });
};

export const useSurveysByTeam = (
  teamId: string,
  specificTeamIsSelected: boolean,
) =>
  useQuery({
    enabled: specificTeamIsSelected,
    queryKey: ["surveys", teamId],
    queryFn: async () => (await getTeamSurveys(teamId)).data as Array<Survey>,
  });

export const useCreateSurveyMutation = (
  onSuccess = (data) => {},
  onError = () => {},
) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createSurvey,
    onSuccess: (data) => {
      notifications.update({
        id: "load-data",
        color: "teal",
        loading: false,
        title: "Success",
        message: "Survey Created...!",
        icon: <IconCheck style={{ width: rem(18), height: rem(18) }} />,
        autoClose: 2000,
      });
      queryClient.invalidateQueries({ queryKey: ["whatsappsurveys"] });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      onSuccess(data);
    },
    onError: (error: any) => {
      notifications.show({
        id: "load-data",
        color: "red",
        title: "Failed",
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      onError();
    },
  });

  return createMutation;
};

//--------------create survey landing page query-----------------
type LandingProps = {
  close: () => void;
  resetForm: () => void;
  setIsCreating: React.Dispatch<React.SetStateAction<Boolean>>;
};

export const useCreateSurveyLandingPageMutation = ({
  close,
  resetForm,
  setIsCreating,
}: LandingProps) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createSurveyLandingPage,
    onSuccess: () => {
      notifications.update({
        id: "load-data",
        color: "teal",
        loading: false,
        title: "Success",
        message: "Survey Landing Page created Created...!",
        icon: <IconCheck size="1rem" />,
        autoClose: 2000,
      });
      queryClient.invalidateQueries({ queryKey: ["surveysLanding"] });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      close();
      setIsCreating(false);
      resetForm();
    },
    onError: (error: any) => {
      notifications.show({
        id: "load-data",
        color: "red",
        title: "Failed",
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
  });

  return createMutation;
};

//-------update landinf page -------------

type UpdateLandingProps = {
  close: () => void;
  resetForm: () => void;
  setIsCreating: React.Dispatch<React.SetStateAction<Boolean>>;
};
export const useUpdateSurveyLandingPageMutation = ({
  close,
  resetForm,
  setIsCreating,
}: UpdateLandingProps) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: updateSurveyLandingPage,
    onSuccess: () => {
      notifications.update({
        id: "load-data",
        color: "teal",
        loading: false,
        title: "Success",
        message: "Survey Landing Page Updated...!",
        icon: <IconCheck size="1rem" />,
        autoClose: 2000,
      });
      queryClient.invalidateQueries({ queryKey: ["surveysLanding"] });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      close();
      setIsCreating(false);
      resetForm();
    },
    onError: (error: any) => {
      notifications.show({
        id: "load-data",
        color: "red",
        title: "Failed",
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
  });

  return updateMutation;
};

type CloneProps = {
  close: () => void;
  selectedTeamId: String;
};

export function useCloneSurveyMutation({ close, selectedTeamId }: CloneProps) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, teamIds }: { id: string; teamIds: string[] }) =>
      cloneSurvey(id, teamIds),
    onSuccess: (data, variables) => {
      notifications.update({
        id: "load-data",
        color: "teal",
        title: "Success",
        loading: false,
        message: "Survey Copy created!",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["surveys", selectedTeamId] });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      close();
    },
    onError: (error: any) => {
      console.error("Error Survey Clone:", error.message);
      notifications.update({
        id: "load-data",
        color: "red",
        title: "Failed",
        loading: false,
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
  });
}

export function useUpdateSurveyPwdMutation(id, passwordProtect, password) {
  return useMutation({
    mutationFn: () => handleSurveyPwd(id, passwordProtect, password),
    onSuccess: () => {
      notifications.show({
        id: "load-data",
        color: passwordProtect ? "green" : "red",
        title: passwordProtect ? "Success" : "Disabled Password - Success",
        message: "Sucessfully updated Password Protection ",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
    onError: (error: any) => {
      console.error("Error Password Protection:", error.message);
      notifications.show({
        id: "load-data",
        color: "red",
        title: "Failed",
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
  });
}

async function handleSurveyPwd(id, passwordProtect, password) {
  const surveyId = id;
  let data = { password: password };

  if (passwordProtect) {
    data = { password: password };
  } else {
    data = { password: "_remove_pwd" };
  }
  return updateSurveyPassword(surveyId, data);
}

export function useVerifySurveyPwdMutation(
  surveyId: string,
  password: string,
  close: any,
  setIsPasswordVerified: any,
) {
  return useMutation({
    mutationFn: () => handleSurveyVerifyPwd(surveyId, password),
    onSuccess: (response) => {
      notifications.update({
        id: "load-data",
        color: "green",
        loading: false,
        title: "Access Verified...",
        message: "Start attending the survey. ",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      setIsPasswordVerified(true);
      close();
    },
    onError: (error: any) => {
      console.error("Error Survey Login", error.message);
      notifications.update({
        id: "load-data",
        loading: false,
        color: "red",
        title: "Failed",
        message: error?.response?.data?.message,
        icon: <IconX size="1rem" />,
        autoClose: 3000,
      });
    },
  });
}

async function handleSurveyVerifyPwd(surveyId: string, password: string) {
  let data = { password: password };
  return verifySurveyPassword(surveyId, data);
}

export function useEditSurveyMutation(id, setIsLoading) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => updateSurvey(id, data),
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
        title: "Some Changes Failed",
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ["survey"] });
      setIsLoading(false);
    },
  });
}

export const useUpdateSurveyGoogleLinkMutation = (
  surveyTeamMapId: string,
  setLinkUpdateStatus: (value: boolean) => void,
) => {
  const updateMutation = useMutation({
    mutationFn: ({ data }: any) => {
      return updateSurveyGoogleLink(surveyTeamMapId, data);
    },
    onSuccess: (data) => {
      notifications.clean();
      setLinkUpdateStatus(true);
    },
    onError: (err) => {
      console.error(err);
      notifications.show({
        message: "Error updating google link",
        color: "red",
      });
      setLinkUpdateStatus(false);
    },
  });

  return updateMutation;
};

export function useUpdateVisitedMutation() {
  return useMutation({
    mutationFn: (id: string) => updateSurveyVisited(id),
  });
}

export function useUpdateStartedMutation() {
  return useMutation({
    mutationFn: (id: string) => updateSurveyStarted(id),
  });
}

export function useUpdateCompletedMutation() {
  return useMutation({
    mutationFn: (id: string) => updateSurveyCompleted(id),
  });
}

export function useDeleteSurveyMutation() {
  const queryClient = useQueryClient();
  const surveyDeleteMutation = useMutation({
    mutationFn: deleteSurvey,
    onSuccess: () => {
      showSuccessToast("Survey Deleted Successfully!");
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });
  return surveyDeleteMutation;
}

export function useUpdateSurveyMutation() {
  const queryClient = useQueryClient();
  const surveyUpdateMutation = useMutation({
    mutationFn: ({ surveyId, data }: { surveyId: string; data: any }) =>
      updateSurvey(surveyId, data),
    onSuccess: () => {
      showSuccessToast("Survey Updated Successfully!");
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });
  return surveyUpdateMutation;
}
