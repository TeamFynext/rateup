import { rem } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import { getTeamSurveys } from "../team/team.api";
import {
  cloneSurvey,
  createSurvey,
  createSurveyLandingPage,
  createSurveyVariable,
  deleteSurvey,
  deleteSurveyVariable,
  getActiveSurveysSummary,
  getLandingpage,
  getNPSSurveyResponseForGraph,
  getPhoneNumberFromSurveyTeamMapId,
  getPublicSurvey,
  getPublicSurveyGoogleLink,
  getSurvey,
  getSurveyByLandingId,
  getSurveyLandings,
  getSurveyResponseForGraph,
  getSurveys,
  getSurveysSummary,
  getSurveyStats,
  getSurveyStatsBySurveyTeamMapId,
  getSurveyTemplates,
  getSurveyVariables,
  getSurveyWithQuestions,
  getWhatsappSurveys,
  sendEmail,
  sendOTPEmail,
  updateReviewLinkStatsOnSurvey,
  updateSurvey,
  updateSurveyCompleted,
  updateSurveyGoogleLink,
  updateSurveyLandingPage,
  updateSurveyPassword,
  updateSurveyStarted,
  updateSurveyVariable,
  updateSurveyVisited,
  validateOTP,
  verifySurveyPassword,
} from "./survey.api";

export const useSurvey = (surveyId: string) => {
  return useQuery({
    queryKey: ["survey", surveyId],
    enabled: !!surveyId,
    queryFn: () => getSurvey(surveyId),
    refetchOnWindowFocus: "always",
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

export const usePhoneFromSurveyTeamMapId = (surveyTeamMapId: string) =>
  useQuery({
    enabled: !!surveyTeamMapId,
    queryKey: ["waSettings"],
    queryFn: () => getPhoneNumberFromSurveyTeamMapId(surveyTeamMapId),
  });

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

export const useSurveyTemplates = (surveyType) => {
  return useQuery({
    queryKey: ["survey-templates", surveyType],
    queryFn: () => getSurveyTemplates(surveyType),
  });
};

export const useSurveys = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ["surveys"],
    queryFn: getSurveys,
    enabled,
  });
};

export const useSurveysWithQuestions = (specificTeamIsSelected: boolean) => {
  return useQuery({
    enabled: !specificTeamIsSelected,
    queryKey: ["surveyswithquestions"],
    queryFn: getSurveyWithQuestions,
  });
};

export const useSurveysSummary = () => {
  return useQuery({
    queryKey: ["surveysSummary"],
    queryFn: getActiveSurveysSummary,
  });
};

export const useAllSurveysSummary = () => {
  return useQuery({
    queryKey: ["allSurveysSummary"],
    queryFn: getSurveysSummary,
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

export const useCreateSurveyMutation = () => {
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

export function useUpdateSurveyPwdMutation(surveyId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSurveyPassword,
    onSuccess: (res: any) => {
      notifications.show({
        id: "load-data",
        color: "green",
        title: res?.data?.isProtected
          ? "Success"
          : "Disabled Password - Success",
        message: "Sucessfully updated Password Protection ",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
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

export function useEditSurveyMutation(id) {
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
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["survey", id] });
      queryClient.invalidateQueries({ queryKey: ["questions", id] });
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

export function useUpdateVisitedMutation(surveyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => updateSurveyVisited(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
    },
  });
}

export function useUpdateStartedMutation(surveyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => updateSurveyStarted(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
    },
  });
}

export function useUpdateCompletedMutation(surveyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => updateSurveyCompleted(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
    },
  });
}

export function useUpdateReviewLinkStatsOnSurveyMutation(surveyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => updateReviewLinkStatsOnSurvey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
    },
  });
}

export const useDeleteSurveyMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (surveyId: string) => deleteSurvey(surveyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });
};

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

export const useGetSurveyStatsBySurveyTeamMapId = (surveyTeamMapId: string) => {
  return useQuery({
    enabled: !!surveyTeamMapId,
    queryKey: ["surveyStats", surveyTeamMapId],
    queryFn: () => getSurveyStatsBySurveyTeamMapId(surveyTeamMapId),
  });
};

export const useGetSurveyStats = (surveyId) => {
  return useQuery({
    queryFn: () => getSurveyStats(surveyId),
    queryKey: ["SurveyStats", surveyId],
    enabled: !!surveyId,
  });
};

export const useGetSurveyVariables = (surveyId, isPublic) => {
  return useQuery({
    queryKey: ["surveyVariables", surveyId],
    queryFn: () => getSurveyVariables(surveyId, isPublic),
    enabled: !!surveyId,
  });
};

export const useCreateSurveyVariableMutation = (surveyId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSurveyVariable,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["surveyVariables", surveyId],
      });
      showSuccessToast("Variable created successfully", "", <IconCheck />);
    },
    onError: (e: any) => {
      showErrorToast(
        `Error creating variable:${e?.response?.data?.error}`,
        "",
        <IconX />,
      );
    },
  });
};

export const useUpdateSurveyVariableMutation = (surveyId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSurveyVariable,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["surveyVariables", surveyId],
      });
      showSuccessToast("Variable updated successfully", "", <IconCheck />);
    },
    onError: (e: any) => {
      showErrorToast(
        `Error updating variable:${e?.response?.data?.error}`,
        "",
        <IconX />,
      );
    },
  });
};

export const useDeleteSurveyVariableMutation = (surveyId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSurveyVariable,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["surveyVariables", surveyId],
      });
      showSuccessToast("Variable deleted successfully", "", <IconCheck />);
    },
    onError: (e: any) => {
      showErrorToast(
        `Error deleting variable:${e?.response?.data?.error}`,
        "",
        <IconX />,
      );
    },
  });
};

export const useSendEmail = () => {
  return useMutation({
    mutationFn: sendEmail,
  });
};

export const useSendOTPEmail = () => {
  return useMutation({
    mutationFn: sendOTPEmail,
  });
};

export const useValidateOtp = () => {
  return useMutation({
    mutationFn: validateOTP,
  });
};

export const useSurveyUpdateMutation = (surveyId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ surveyId, data }: { surveyId: string; data: any }) => {
      return updateSurvey(surveyId, data);
    },
    onSuccess: () => {
      showSuccessToast("Data updated Successfully", surveyId);
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey-templates", "web"] });
    },
    onError: () => {
      showErrorToast("Something went wrong, Please try again later.", surveyId);
    },
  });
};

export const useAllResponseForGraph = (
  timePeriod,
  userTimeZone,
  surveyId = "",
  teamMapIds = [],
) => {
  return useQuery({
    queryKey: [
      "reponse",
      "graph",
      timePeriod,
      userTimeZone,
      surveyId,
      teamMapIds,
    ],
    queryFn: () =>
      getSurveyResponseForGraph(timePeriod, userTimeZone, surveyId, teamMapIds),
  });
};

export const useAllResponseNPSForGraph = (
  timePeriod,
  userTimeZone,
  surveyId = "",
  teamMapIds = [],
) => {
  return useQuery({
    queryKey: [
      "reponse-nps",
      "graph-nps",
      timePeriod,
      userTimeZone,
      surveyId,
      teamMapIds,
    ],
    queryFn: () =>
      getNPSSurveyResponseForGraph(
        timePeriod,
        userTimeZone,
        surveyId,
        teamMapIds,
      ),
  });
};
