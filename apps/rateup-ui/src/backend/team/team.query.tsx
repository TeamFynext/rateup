import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { getOrgIdRole, getUserID } from "@/utils/userInfo.ts";

import type { IEditTeam } from "./team.api";
import {
  addUsertoTeams,
  createTeam,
  deleteInviteById,
  deleteTeamById,
  editTeam,
  getNotTeamMembers,
  getSurveyLanguagesFromTeam,
  getTeamById,
  getTeamFeatures,
  getTeamMembersFromInvitation,
  getTeamsByUser,
  removeUserFromTeam,
  resendInviteTeamMember,
  updateTeamFeatures,
} from "./team.api";

export function useTeamsByUser() {
  return useQuery({
    queryKey: ["teamsDataUserQuery"],
    queryFn: getTeamsByUser,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
  });
}
export function useTeamMembersFromInvitation(teamId: string) {
  return useQuery({
    queryKey: ["invitedTeamMembers", teamId],
    queryFn: () => getTeamMembersFromInvitation(teamId),
    enabled: !!teamId,
  });
}

export function useNotTeamMembers(teamId: string) {
  return useQuery({
    queryKey: ["notTeamMembers", teamId],
    queryFn: () => getNotTeamMembers(teamId),
    enabled: !!teamId,
  });
}

export function useCreateTeamMutation(
  setIsCreateTeamDialogOpen: (arg: boolean) => void,
  createTeamForm: any,
  setIsCreating: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values) => handleCreateTeam(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamsDataUserQuery"] });
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
    onSuccess: (res) => {
      toast.success("Team Details Updated Successfully!", {
        id: "load-data",
      });
      setIsLoading(false);
      queryClient.invalidateQueries({ queryKey: ["teamsDetailsQuery"] });
      queryClient.invalidateQueries({ queryKey: ["teamsDataUserQuery"] });
      queryClient.invalidateQueries({ queryKey: ["invitedTeamMembers", id] });
      if (surveyId) {
        queryClient.invalidateQueries({ queryKey: ["survey", surveyId] });
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
      (queryClient.invalidateQueries({ queryKey: ["teamsDataUserQuery"] }),
        toast.success("Team deleted successfully.", {
          id: "load-data",
        }));
    },
    onError: (error) => {
      toast.error(error?.message || "Error deleting team", {
        id: "load-data",
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
    color: values.color,
    orgId,
    userId,
    whatsappAccessToken: values.whatsappAccessToken,
    features: values.features,
  };
  return createTeam(data);
}

export function userResendInviteTeamMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resendInviteTeamMember(id),
    onSuccess: () => {
      (queryClient.invalidateQueries({ queryKey: ["teamsDataUserQuery"] }),
        toast.success("Team Invitation Resend successfully.", {
          id: "load-data-invitaion",
        }));
    },
  });
}
export function useDeleteInviteMutation(teamId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInviteById(id),
    onSuccess: () => {
      (queryClient.invalidateQueries({ queryKey: ["teamsDetailsQuery"] }),
        queryClient.invalidateQueries({
          queryKey: ["invitedTeamMembers", teamId],
        }),
        queryClient.invalidateQueries({ queryKey: ["orgTeamsAllDataQuery"] }));
      toast.success("Invite deleted successfully.", {
        id: "load-data-deleting",
      });
      close();
    },
  });
}

function useSurveyLanguagesFromTeam(teamId: string) {
  return useQuery({
    queryKey: ["surveyLanguages", teamId],
    queryFn: () => getSurveyLanguagesFromTeam(teamId),
    enabled: !!teamId,
  });
}

export function useAddUsertoTeams() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addUsertoTeams,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgTeamsDataQuery"] });
      queryClient.invalidateQueries({ queryKey: ["notTeamMembers"] });
      queryClient.invalidateQueries({ queryKey: ["teamsDataUserQuery"] });
      queryClient.invalidateQueries({ queryKey: ["invitedTeamMembers"] });
      queryClient.invalidateQueries({ queryKey: ["orgTeamsAllDataQuery"] });

      toast.success("success");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed");
    },
  });
}

export function useRemoveUserFromTeam(teamId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeUserFromTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orgTeamsDataQuery"] });
      queryClient.invalidateQueries({ queryKey: ["orgTeamsAllDataQuery"] });
      queryClient.invalidateQueries({
        queryKey: ["invitedTeamMembers", teamId],
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
    queryKey: ["teamsDetailsQuery", teamId],
    queryFn: () => getTeamById(teamId),
    enabled: !!teamId,
  });
}

export function useTeamFeatures(teamId: string) {
  return useQuery({
    queryKey: ["teamFeatures", teamId],
    queryFn: () => getTeamFeatures(teamId),
    enabled: !!teamId,
  });
}

export function useUpdateTeamFeatures(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (features: string[]) => updateTeamFeatures(teamId, features),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamFeatures", teamId] });
      toast.success("Feature access updated successfully.");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update feature access.");
    },
  });
}

/**
 * Returns the union of all enabled features across the given teamIds.
 * Pass an empty array (or skip) to get an empty Set.
 */
export function useMyAllowedFeatures(teamIds: string[]): {
  allowedFeatures: Set<string>;
  isPending: boolean;
} {
  const results = useQueries({
    queries: teamIds.map((id) => ({
      queryKey: ["teamFeatures", id],
      queryFn: () => getTeamFeatures(id),
      enabled: !!id,
    })),
  });

  const union = new Set<string>();
  let isPending = false;
  for (const result of results) {
    if (result.isPending || result.isLoading) {
      isPending = true;
    }
    if (result.data) {
      for (const f of result.data.features) {
        union.add(f.feature);
      }
    }
  }
  return { allowedFeatures: union, isPending };
}
