import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { IUpdateLogo, IUpdateOrgDetails } from "./org.api";
import {
  completeOrgDetails,
  deleteOrgByAdmin,
  getAllOrgs,
  getAllTeamsMembersOfOrg,
  getChecklist,
  getOrgStats,
  getTeamsMembersOfOrg,
  getWebhookClientSecret,
  orgNameAndPhone,
  sendDeleteOrgEmail,
  updateOrgDetails,
  updateOrgLogo,
  updateOrgPause,
  updateRole,
} from "./org.api";

export const useTeamsMembersOfOrg = () => {
  return useQuery({
    queryKey: ["orgTeamsDataQuery"],
    queryFn: () => getTeamsMembersOfOrg(),
  });
};

export const useAllTeamsMembersOfOrg = () => {
  return useQuery({
    queryKey: ["orgTeamsAllDataQuery"],
    queryFn: () => getAllTeamsMembersOfOrg(),
  });
};

export const useAllOrgs = () =>
  useQuery({
    queryKey: ["org"],
    queryFn: getAllOrgs,
  });

export const useOrgStats = (orgId: string) =>
  useQuery({
    queryKey: ["org", orgId, "stats"],
    queryFn: () => getOrgStats(orgId),
    enabled: !!orgId,
  });

export function useUpdateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: { memberId: string; body: { role: string } }) =>
      updateRole(values.memberId, values.body),
    onSuccess: () => {
      toast.success("Staff Role Updated Successfully!", {
        id: "load-data",
      });
      queryClient.invalidateQueries({ queryKey: ["orgTeamsDataQuery"] });
      queryClient.invalidateQueries({ queryKey: ["invitedTeamMembers"] });
      queryClient.invalidateQueries({ queryKey: ["orgTeamsAllDataQuery"] });
    },
    onError: (error) => {
      console.error("Error Role Update:", error.message);
      toast.error(error?.message, {
        id: "load-data",
      });
    },
  });
}

export function useUpdateOrgLogoMutation(setIsLoadingUpload: (uploading: boolean) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: IUpdateLogo) => updateOrgLogo(values),
    onSuccess: () => {
      toast.success("Logo Updated Successfully!", {
        id: "load-data",
      });
      setIsLoadingUpload(false);
      queryClient.resetQueries({ queryKey: ["userInfoQuery"] });
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
    },
    onError: (error) => {
      console.error("Error Logo Update:", error.message);
      toast.error(error?.message, {
        id: "load-data",
      });
      setIsLoadingUpload(false);
    },
  });
}

export function useUpdateOrgDetailsMutation(options?: { showSuccessToast?: boolean }) {
  const queryClient = useQueryClient();
  const showSuccessToast = options?.showSuccessToast ?? true;
  return useMutation({
    mutationFn: (values: Partial<IUpdateOrgDetails>) => updateOrgDetails(values),
    onSuccess: (_, variables) => {
      if (
        showSuccessToast &&
        (Object.keys(variables).length > 1 || !("isConversionApiActive" in variables))
      ) {
        toast.success("Org details updated successfully", {
          id: "load-data",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
    },
    onError: (error) => {
      console.error("Error in Organization Update:", error.message);
      toast.error(error?.message, {
        id: "load-data",
      });
    },
  });
}

export const useUpdateOrgPause = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateOrgPause,
    onSuccess: () => {
      toast.success("Pause status has been updated");
      queryClient.invalidateQueries({ queryKey: ["org"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Error in updating pause status");
    },
  });
};

export const useGetWebhookClientSecret = (webhookUrl: string | undefined) => {
  return useQuery({
    queryKey: ["webhookClientSecret"],
    queryFn: getWebhookClientSecret,
    enabled: !!webhookUrl,
  });
};

export function useCompleteOrgDetails() {
  return useMutation({
    mutationFn: ({ onboarding }: { onboarding?: Record<string, unknown> }) =>
      completeOrgDetails(onboarding),
  });
}

export function useOrgNameAndPhone() {
  return useQuery({
    queryKey: ["orgNameAndPhone"],
    queryFn: orgNameAndPhone,
  });
}

export function useChecklist() {
  return useQuery({
    queryKey: ["onboarding-checklist"],
    queryFn: getChecklist,
  });
}

export const useSendDeleteOrgEmail = () => {
  return useMutation({
    mutationFn: (orgId: string) => sendDeleteOrgEmail(orgId),
  });
};

export const useDeleteOrgByAdminMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) => deleteOrgByAdmin(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org"] });
    },
  });
};
