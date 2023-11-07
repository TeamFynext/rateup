import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import {
  IUpdateLogo,
  getTeamsMembersOfOrg,
  updateOrgLogo,
  updateRole,
  updateOrgDetails,
  IUpdateOrgDetails,
} from "./org.api";

export const useTeamsMembersOfOrg = () => {
  return useQuery({
    queryKey: ["orgTeamsDataQuery"],
    queryFn: () => getTeamsMembersOfOrg(),
  });
};

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
        message: "Member Role Updated Successfully!",
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

export function useUpdateOrgDetailsMutation(setIsLoading) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: IUpdateOrgDetails) => updateOrgDetails(values),
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
      setIsLoading(false);
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
      setIsLoading(false);
    },
  });
}
