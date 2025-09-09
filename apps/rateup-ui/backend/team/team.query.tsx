import { useRouter } from "next/navigation";

import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getOrgIdRole, getUserID } from "../../utils/userInfo";
import {
  createTeam,
  deleteInviteById,
  editTeam,
  getSurveyLanguagesFromTeam,
  getTeamMembersFromInvitation,
  getTeamsByUser,
  IEditTeam,
  resendInviteTeamMember,
} from "./team.api";

export function useTeamsByUser() {
  return useQuery({
    queryKey: ["teamsDataUserQuery"],
    queryFn: getTeamsByUser,
  });
}
export function useTeamMembersFromInvitation(teamId: string) {
  return useQuery({
    queryKey: ["invitedTeamMembers", teamId],
    queryFn: () => getTeamMembersFromInvitation(teamId),
    enabled: !!teamId,
  });
}

export function useCreateTeamMutation(
  close: () => void,
  createTeamForm: any,
  setIsCreating: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values) => handleCreateTeam(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamsDataUserQuery"] }),
        notifications.update({
          id: "load-data",
          color: "teal",
          title: "Success",
          loading: false,
          message: "Team created successfully.",
          icon: <IconCheck size="1rem" />,
          autoClose: 3000,
        });
      setIsCreating(false);
      close();
      createTeamForm.reset();
    },
    onError: (error: any) => {
      console.error("Error creating the post:", error.message);
      notifications.update({
        id: "load-data",
        color: "red",
        title: "Failed",
        loading: false,
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      setIsCreating(false);
    },
  });
}

export function useEditTeamMutation(
  id: string,
  setIsLoading: (e: boolean) => void,
  surveyId?: string,
  onlyTag?: boolean,
) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (values: IEditTeam) => editTeam(id, values, onlyTag),
    onSuccess: (res) => {
      notifications.show({
        id: "load-data",
        color: "teal",
        title: "Success",
        message: "Team Details Updated Successfully!",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      setIsLoading(false);
      queryClient.invalidateQueries({ queryKey: ["teamsDetailsQuery"] });
      queryClient.invalidateQueries({ queryKey: ["teamsDataUserQuery"] });
      queryClient.invalidateQueries({ queryKey: ["invitedTeamMembers", id] });
      if (surveyId) {
        queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
      }
    },
    onError: (error: any) => {
      console.error("Error Team Update:", error.message);
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

export function useDeleteTeamMutation(handleDeleteTeam) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => handleDeleteTeam(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamsDataUserQuery"] }),
        notifications.update({
          id: "load-data",
          color: "teal",
          loading: false,
          title: "Delete Success",
          message: "Team deleted successfully.",
          icon: <IconCheck size="1rem" />,
          autoClose: 3000,
        });
      router.push("/dashboard/teams");
    },
    onError: (error: any) => {
      notifications.update({
        id: "load-data",
        color: "red",
        loading: false,
        title: "Failed",
        message: error.response.data,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
  });
}

async function handleCreateTeam(values) {
  const { orgId } = await getOrgIdRole();
  const { userId } = await getUserID();
  const data = {
    name: values.name,
    code: values.code,
    orgId,
    userId,
    whatsappAccessToken: values.whatsappAccessToken,
  };
  return createTeam(data);
}

export function userResendInviteTeamMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resendInviteTeamMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamsDataUserQuery"] }),
        notifications.update({
          id: "load-data-invitaion",
          color: "teal",
          loading: false,
          title: "Resend Invitation Success",
          message: "Team Invitation Resend successfully.",
          icon: <IconCheck size="1rem" />,
          autoClose: 3000,
        });
    },
  });
}
export function useDeleteInviteMutation(teamId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInviteById(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamsDetailsQuery"] }),
        queryClient.invalidateQueries({
          queryKey: ["invitedTeamMembers", teamId],
        }),
        notifications.update({
          id: "load-data-deleting",
          color: "teal",
          title: "Success",
          loading: false,
          message: "Invite deleted successfully.",
          icon: <IconCheck size="1rem" />,
          autoClose: 3000,
        });
      close();
    },
  });
}

export function useSurveyLanguagesFromTeam(teamId: string) {
  return useQuery({
    queryKey: ["surveyLanguages", teamId],
    queryFn: () => getSurveyLanguagesFromTeam(teamId),
    enabled: !!teamId,
  });
}
