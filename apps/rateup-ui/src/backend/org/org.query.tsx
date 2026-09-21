import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { subscriptionKeys } from "@/backend/campaign/campaign.keys";
import { orgKeys, teamKeys } from "@/backend/org/org.keys";
import { userKeys } from "@/backend/user/user.keys";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import type { IMemberPermissions, IUpdateLogo, IUpdateOrgDetails } from "./org.api";
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
  getMemberActivity,
  updateMemberPermissions,
  updateOrgDetails,
  updateOrgLogo,
  updateOrgPause,
  updateRole,
  transferOwnership,
  type IUpdateRole,
} from "./org.api";

export const useTeamsMembersOfOrg = () => {
  return useQuery({
    queryKey: orgKeys.teams(),
    queryFn: () => getTeamsMembersOfOrg(),
  });
};

export const useAllTeamsMembersOfOrg = () => {
  return useQuery({
    queryKey: orgKeys.teamsAll(),
    queryFn: () => getAllTeamsMembersOfOrg(),
  });
};

export const useAllOrgs = () =>
  useQuery({
    queryKey: orgKeys.all(),
    queryFn: getAllOrgs,
  });

export const useOrgStats = (orgId: string) =>
  useQuery({
    queryKey: orgKeys.stats(orgId),
    queryFn: () => getOrgStats(orgId),
    enabled: !!orgId,
  });

export function useUpdateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: { memberId: string; body: IUpdateRole }) =>
      updateRole(values.memberId, values.body),
    onSuccess: () => {
      toast.success("Role updated", {
        id: "load-data",
      });
      queryClient.invalidateQueries({ queryKey: orgKeys.teams() });
      queryClient.invalidateQueries({ queryKey: teamKeys.invited() });
      queryClient.invalidateQueries({ queryKey: orgKeys.teamsAll() });
      // The changed person may be the one signed in on another tab; their own permissions refresh too.
      queryClient.invalidateQueries({ queryKey: userKeys.info() });
    },
    onError: (error) => {
      console.error("Error Role Update:", error.message);
      toast.error(error?.message, {
        id: "load-data",
      });
    },
  });
}

/**
 * Hands the organisation to another member. The API makes them OWNER and leaves the caller as
 * ADMIN; everything role-derived on this device is stale afterwards, so the whole cache refetches.
 */
export function useMemberActivity(memberId: string, page: number, enabled = true) {
  return useQuery({
    queryKey: orgKeys.memberActivity(memberId, page),
    queryFn: () => getMemberActivity(memberId, page),
    enabled: enabled && memberId.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useUpdateMemberPermissionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: { memberId: string; body: IMemberPermissions }) =>
      updateMemberPermissions(values.memberId, values.body),
    onSuccess: () => {
      toast.success("Permissions saved", { id: "member-permissions" });
      queryClient.invalidateQueries({ queryKey: orgKeys.teamsAll() });
      queryClient.invalidateQueries({ queryKey: userKeys.info() });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not save the permissions"), {
        id: "member-permissions",
      });
    },
  });
}

export function useTransferOwnershipMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => transferOwnership(userId),
    onSuccess: () => {
      toast.success("Ownership transferred", { id: "transfer-ownership" });
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Could not transfer ownership"), {
        id: "transfer-ownership",
      });
    },
  });
}

export function useUpdateOrgLogoMutation(setIsLoadingUpload: (uploading: boolean) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: IUpdateLogo) => updateOrgLogo(values),
    onSuccess: () => {
      toast.success("Logo updated", {
        id: "load-data",
      });
      setIsLoadingUpload(false);
      queryClient.resetQueries({ queryKey: userKeys.info() });
      queryClient.invalidateQueries({ queryKey: userKeys.info() });
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
      queryClient.invalidateQueries({ queryKey: userKeys.info() });
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
      queryClient.invalidateQueries({ queryKey: orgKeys.all() });
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
    queryKey: orgKeys.nameAndPhone(),
    queryFn: orgNameAndPhone,
  });
}

export function useChecklist(enabled = true) {
  return useQuery({
    queryKey: subscriptionKeys.onboardingChecklist(),
    queryFn: getChecklist,
    enabled,
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
      queryClient.invalidateQueries({ queryKey: orgKeys.all() });
    },
  });
};
