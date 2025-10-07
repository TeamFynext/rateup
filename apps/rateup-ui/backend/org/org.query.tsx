import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PhoneInputWithCountrySelect from "react-phone-number-input";

import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import {
  completeOrgDetails,
  getAllOrgs,
  getOrgStats,
  getTeamsMembersOfOrg,
  getWebhookClientSecret,
  IUpdateLogo,
  IUpdateOrgDetails,
  orgNameAndPhone,
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
      notifications.update({
        id: "load-data",
        loading: false,
        color: "teal",
        title: "Success",
        message: "Staff Role Updated Successfully!",
        icon: <IconCheck size="1rem" />,
        autoClose: 2000,
      });
      queryClient.invalidateQueries({ queryKey: ["orgTeamsDataQuery"] });
      queryClient.invalidateQueries({ queryKey: ["invitedTeamMembers"] });
    },
    onError: (error: any) => {
      console.error("Error Role Update:", error.message);
      notifications.update({
        id: "load-data",
        loading: false,
        color: "red",
        title: "Failed",
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
  });
}

export function useUpdateOrgLogoMutation(setIsLoadingUpload) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: IUpdateLogo) => updateOrgLogo(values),
    onSuccess: () => {
      notifications.update({
        id: "load-data",
        loading: false,
        color: "teal",
        title: "Success",
        message: "Logo Updated Successfully!",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      setIsLoadingUpload(false);
      queryClient.resetQueries({ queryKey: ["userInfoQuery"] });
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
    },
    onError: (error: any) => {
      console.error("Error Logo Update:", error.message);
      notifications.update({
        id: "load-data",
        loading: false,
        color: "red",
        title: "Failed",
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      setIsLoadingUpload(false);
    },
  });
}

export function useUpdateOrgDetailsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Partial<IUpdateOrgDetails>) =>
      updateOrgDetails(values),
    onSuccess: () => {
      notifications.update({
        id: "load-data",
        loading: false,
        color: "teal",
        title: "Success",
        message: "Org details updated successfully",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
      queryClient.resetQueries({ queryKey: ["userInfoQuery"] });
    },
    onError: (error: any) => {
      console.error("Error in Organization Update:", error.message);
      notifications.update({
        id: "load-data",
        loading: false,
        color: "red",
        title: "Failed",
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
  });
}

export const useUpdateOrgPause = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateOrgPause,
    onSuccess: () => {
      showSuccessToast("Pause status has been updated");
      queryClient.invalidateQueries({ queryKey: ["org"] });
    },
    onError: () => {
      showErrorToast("Error in updating pause status");
    },
  });
};

export const useGetWebhookClientSecret = (webhookUrl) => {
  return useQuery({
    queryKey: ["webhookClientSecret"],
    queryFn: getWebhookClientSecret,
    enabled: !!webhookUrl,
  });
};

export function useCompleteOrgDetails() {
  return useMutation({
    mutationFn: ({
      orgName,
      tellUsMore,
      phone,
    }: {
      orgName?: string;
      tellUsMore?: Record<string, unknown>;
      phone: string;
    }) => completeOrgDetails(orgName, tellUsMore, phone),
  });
}

export function useOrgNameAndPhone() {
  return useQuery({
    queryKey: ["orgNameAndPhone"],
    queryFn: orgNameAndPhone,
  });
}
