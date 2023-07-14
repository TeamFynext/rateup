import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { getTeamsMembersOfOrg, updateRole } from "./org.api";

export function useTeamsMembersOfOrg() {
 // export function useTeamsMembersOfOrg(queryClient) {
  //TODO SSR
  return useQuery(["orgTeamsDataQuery"], getTeamsMembersOfOrg, {
    refetchOnWindowFocus: "always",
    refetchOnMount: "always",
    //initialData: () => queryClient.getQueryData(["teamsByUser"]),
    onSuccess: (data) => {
    //  console.log("Initial Prefetch Data:", queryClient.getQueryData(["teamsByUser"]));

     // console.log("New fetch Data:", data);
    },
  });
}

export function useUpdateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation((values: {memberId: string, body: {role: string}}) => 
  updateRole(values.memberId, values.body), {
    onSuccess: () => {
      notifications.show({
        id: 'load-data',
        color: 'teal',
        title: 'Success',
        message: 'Member Role Updated Successfully!',
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      queryClient.invalidateQueries(["orgTeamsDataQuery"]);
    },
    onError: (error: any) => {
      console.error("Error Role Update:", error.message);
      notifications.show({
        id: 'load-data',
        color: 'red',
        title: 'Failed',
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
  });
}