import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cloneSurvey,
  createSurvey,
  getPublicSurvey,
  getSurvey,
  getSurveys,
  getWhatsappSurveys,
  updateSurvey,
  updateSurveyCompleted,
  updateSurveyPassword,
  updateSurveyStarted,
  updateSurveyVisited,
  verifySurveyPassword,
} from "./survey.api";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { getTeamSurveys } from "../team/team.api";

export const useSurvey = (surveyId: string) =>
  useQuery({
    enabled: !!surveyId,
    queryKey: ["survey", surveyId],
    queryFn: () => getSurvey(surveyId),
  });
//------------whatsapp survey --------------
//----@author:harshad-----------
export const useWhatsappSurveys = (teamIsSelected) =>
  useQuery({
    enabled: !teamIsSelected,
    queryKey: ["whatsappsurveys"],
    queryFn: getWhatsappSurveys,
  });

export const usePublicSurvey = (surveyId: string) =>
  useQuery({
    enabled: !!surveyId,
    queryKey: ["public-survey", surveyId],
    queryFn: () => getPublicSurvey(surveyId),
  });

export const useSurveys = (teamIsSelected) =>
  useQuery({
    enabled: !teamIsSelected,
    queryKey: ["surveys"],
    queryFn: getSurveys,
  });

export const useSurveysByTeam = (teamId: string, teamIsSelected) =>
  useQuery({
    enabled: teamIsSelected,
    queryKey: ["surveysByTeam", teamId],
    queryFn: () => getTeamSurveys(teamId),
  });

type MyProps = {
  close: () => void;
};

export const useCreateSurveyMutation = ({ close }: MyProps) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createSurvey,
    onSuccess: () => {
      notifications.show({
        message: "Created!",
      });
      queryClient.invalidateQueries(["surveys"]);
      queryClient.invalidateQueries(["surveysByTeam"]);
      close();
    },
  });

  return createMutation;
};

export function useCloneSurveyMutation(close, selectedTeamId) {
  const queryClient = useQueryClient();
  return useMutation(({ id, teamId } : {id: string, teamId : string}) => cloneSurvey(id, teamId), {
    onSuccess: () => {
      notifications.show({
        id: "load-data",
        color: "teal",
        title: "Success",
        message: "Survey Copy created!",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      queryClient.invalidateQueries(["surveys"]);
      queryClient.invalidateQueries(['surveysByTeam', selectedTeamId]);
      close()
    },
    onError: (error: any) => {
      console.error("Error Survey Clone:", error.message);
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

export function useUpdateSurveyPwdMutation(id, passwordProtect, password) {
  return useMutation(() => handleSurveyPwd(id, passwordProtect, password), {
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
  onStart
) {
  return useMutation(() => handleSurveyVerifyPwd(surveyId, password), {
    onSuccess: (response) => {
      let verified = false;
      if (response?.data?.data === "Access granted") {
        onStart();
        verified = true;
      }
      notifications.show({
        id: "load-data",
        color: verified ? "green" : "red",
        title: verified ? "Access Verified..." : "Password Error",
        message: verified ? "Start attending the survey. " : "Please try again",
        icon: verified ? <IconCheck size="1rem" /> : <IconX size="1rem" />,
        autoClose: 3000,
      });
    },
    onError: (error: any) => {
      console.error("Error Survey Login", error.message);
    },
  });
}

async function handleSurveyVerifyPwd(surveyId: string, password: string) {
  let data = { password: password };
  return verifySurveyPassword(surveyId, data);
}

export function useEditSurveyMutation(id, setIsLoading) {
  const queryClient = useQueryClient();
  return useMutation((data: any) => updateSurvey(id, data), {
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
      queryClient.invalidateQueries(["surveys"]);
      queryClient.invalidateQueries(["survey"]);
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

export function useUpdateVisitedMutation() {
  return useMutation((id: string) => updateSurveyVisited(id));
}

export function useUpdateStartedMutation() {
  return useMutation((id: string) => updateSurveyStarted(id));
}

export function useUpdateCompletedMutation() {
  return useMutation((id: string) => updateSurveyCompleted(id));
}
