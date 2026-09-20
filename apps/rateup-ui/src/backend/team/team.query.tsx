import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orgKeys, teamKeys } from "@/backend/org/org.keys";
import { surveyKeys } from "@/backend/surveys/survey.keys";
import { whatsappKeys } from "@/backend/whatsapp/whatsapp.keys";
import { getOrgIdRole, getUserID } from "@/utils/userInfo.ts";

import type { IEditTeam, UpdateTeamChannelsInput } from "./team.api";
import {
  addUsertoTeams,
  createTeam,
  deleteInviteById,
  deleteTeamById,
  editTeam,
  getNotTeamMembers,
  getSurveyLanguagesFromTeam,
  getTeamById,
  getTeamChannels,
  getTeamMembersFromInvitation,
  getTeamsByUser,
  removeUserFromTeam,
  resendInviteTeamMember,
  updateTeamChannels,
} from "./team.api";

export function useTeamsByUser() {
  return useQuery({
    queryKey: teamKeys.byUser(),
    queryFn: getTeamsByUser,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });
}
export function useTeamMembersFromInvitation(teamId: string) {
  return useQuery({
    queryKey: teamKeys.invitedByTeam(teamId),
    queryFn: () => getTeamMembersFromInvitation(teamId),
    enabled: !!teamId,
  });
}

export function useNotTeamMembers(teamId: string) {
  return useQuery({
    queryKey: teamKeys.notMembersByTeam(teamId),
    queryFn: () => getNotTeamMembers(teamId),
    enabled: !!teamId,
  });
}

interface CreateTeamValues {
  name: string;
  code: string;
  color: string;
  whatsappAccessToken?: string;
}

export function useCreateTeamMutation(
  setIsCreateTeamDialogOpen: (arg: boolean) => void,
  createTeamForm: { reset: () => void },
  setIsCreating: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CreateTeamValues) => handleCreateTeam(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.byUser() });
      toast.success("Team created successfully.", {
        id: "load-data",
      });
      setIsCreating(false);
      setIsCreateTeamDialogOpen(false);
      createTeamForm.reset();
    },
    onError: (error) => {
      console.error("Error creating the post:", error.message);
      toast.error(error?.message, {
        id: "load-data",
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
  return useMutation({
    mutationFn: (values: IEditTeam) => editTeam(id, values, onlyTag),
    onSuccess: (_res) => {
      toast.success("Team Details Updated Successfully!", {
        id: "load-data",
      });
      setIsLoading(false);
      queryClient.invalidateQueries({ queryKey: teamKeys.details() });
      queryClient.invalidateQueries({ queryKey: teamKeys.byUser() });
      queryClient.invalidateQueries({ queryKey: teamKeys.invitedByTeam(id) });
      if (surveyId) {
        queryClient.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) });
      }
    },
    onError: (error) => {
      console.error("Error Team Update:", error.message);
      toast.error(error?.message || "Error updating team details", {
        id: "load-data",
      });

      setIsLoading(false);
    },
  });
}

export function useDeleteTeamMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTeamById,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.byUser() });
      toast.success("Team deleted successfully.", {
        id: "load-data",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error deleting team", {
        id: "load-data",
      });
    },
  });
}

async function handleCreateTeam(values: CreateTeamValues) {
  const { orgId } = await getOrgIdRole();
  const { userId } = await getUserID();
  const data = {
    name: values.name,
    code: values.code,
    color: values.color,
    orgId: orgId!,
    userId,
    whatsappAccessToken: values.whatsappAccessToken!,
  };
  return createTeam(data);
}

export function userResendInviteTeamMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resendInviteTeamMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.byUser() });
      toast.success("Team Invitation Resend successfully.", {
        id: "load-data-invitaion",
      });
    },
  });
}
export function useDeleteInviteMutation(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInviteById(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.details() });
      queryClient.invalidateQueries({
        queryKey: teamKeys.invitedByTeam(teamId),
      });
      queryClient.invalidateQueries({ queryKey: orgKeys.teamsAll() });
      toast.success("Invite deleted successfully.", {
        id: "load-data-deleting",
      });
      close();
    },
  });
}

export function useSurveyLanguagesFromTeam(teamId: string) {
  return useQuery({
    queryKey: surveyKeys.languages(teamId),
    queryFn: () => getSurveyLanguagesFromTeam(teamId),
    enabled: !!teamId,
  });
}

export function useAddUsertoTeams() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addUsertoTeams,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.teams() });
      queryClient.invalidateQueries({ queryKey: teamKeys.notMembers() });
      queryClient.invalidateQueries({ queryKey: teamKeys.byUser() });
      queryClient.invalidateQueries({ queryKey: teamKeys.invited() });
      queryClient.invalidateQueries({ queryKey: orgKeys.teamsAll() });

      toast.success("success");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed");
    },
  });
}

export function useRemoveUserFromTeam(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeUserFromTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.teams() });
      queryClient.invalidateQueries({ queryKey: orgKeys.teamsAll() });
      queryClient.invalidateQueries({
        queryKey: teamKeys.invitedByTeam(teamId),
      });

      toast.success("success");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed");
    },
  });
}

export function useGetTeamById(teamId: string) {
  return useQuery({
    queryKey: teamKeys.detail(teamId),
    queryFn: () => getTeamById(teamId),
    enabled: !!teamId,
  });
}

export function useTeamChannels(teamId: string) {
  return useQuery({
    queryKey: teamKeys.channels(teamId),
    queryFn: () => getTeamChannels(teamId),
    enabled: !!teamId,
  });
}

export function useUpdateTeamChannels(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTeamChannelsInput) => updateTeamChannels(teamId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.channels(teamId) });
      // The caller's own channel list is derived from their teams, so it can change here too.
      // `waSettings` is cached with staleTime: Infinity and would otherwise stay stale until reload.
      queryClient.invalidateQueries({ queryKey: whatsappKeys.settings() });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update channel access.");
    },
  });
}
