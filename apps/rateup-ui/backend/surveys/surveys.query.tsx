import { rem } from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
      toast.success("Survey Created...!", {
        id: "load-data",
      });
      queryClient.invalidateQueries({ queryKey: ["whatsappsurveys"] });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
    onError: (error) => {
      toast.loading(error?.message, {
        id: "load-data",
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
      toast.success("Survey Landing Page created Created...!", {
        id: "load-data",
      });
      queryClient.invalidateQueries({ queryKey: ["surveysLanding"] });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      close();
      setIsCreating(false);
      resetForm();
    },
    onError: (error) => {
      toast.loading(error?.message, {
        id: "load-data",
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
      toast.success("Survey Landing Page Updated...!", {
        id: "load-data",
      });
      queryClient.invalidateQueries({ queryKey: ["surveysLanding"] });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      close();
      setIsCreating(false);
      resetForm();
    },
    onError: (error) => {
      toast.loading(error?.message, {
        id: "load-data",
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
      toast.success("Survey Copy created!", {
        id: "load-data",
      });
      queryClient.invalidateQueries({ queryKey: ["surveys", selectedTeamId] });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      close();
    },
    onError: (error) => {
      console.error("Error Survey Clone:", error.message);
      toast.error(error?.message, {
        id: "load-data",
      });
    },
  });
}

export function useUpdateSurveyPwdMutation(surveyId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSurveyPassword,
    onSuccess: (res: any) => {
      toast.loading("Sucessfully updated Password Protection ", {
        id: "load-data",
      });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
    },
    onError: (error) => {
      console.error("Error Password Protection:", error.message);
      toast.loading(error?.message, {
        id: "load-data",
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
      toast.success("Start attending the survey. ", {
        id: "load-data",
      });
      setIsPasswordVerified(true);
      close();
    },
    onError: (error) => {
      console.error("Error Survey Login", error.message);
      toast.error(error?.message, {
        id: "load-data",
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
      toast.loading("Survey Updated Successfully!", {
        id: "load-data",
      });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["survey", id] });
      queryClient.invalidateQueries({ queryKey: ["questions", id] });
    },
    onError: (error) => {
      console.error("Error Survey Update:", error.message);
      toast.loading(error?.message, {
        id: "load-data",
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
      toast.dismiss();
      setLinkUpdateStatus(true);
    },
    onError: (err) => {
      console.error(err);
      toast.loading("Error updating google link");
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
      toast.success("Survey Updated Successfully!");
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
      toast.success("Variable created successfully", {
        id: "",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error creating variable`, {
        id: "",
      });
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
      toast.success("Variable updated successfully", {
        id: "",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error updating variable`, {
        id: "",
      });
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
      toast.success("Variable deleted successfully", {
        id: "",
      });
    },
    onError: (error) => {
      toast.error(error?.message || `Error deleting variable`, {
        id: "",
      });
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
      toast.success("Data updated Successfully", {
        id: surveyId,
      });
      queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey-templates", "web"] });
    },
    onError: (error) => {
      toast.error(
        error?.message || "Something went wrong, Please try again later.",
        {
          id: surveyId,
        },
      );
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
