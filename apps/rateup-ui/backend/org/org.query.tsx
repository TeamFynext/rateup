import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { getTeamsMembersOfOrg, updateRole } from "./org.api";

 export function useTeamsMembersOfOrg(queryClient) {
  return useQuery(["orgTeamsDataQuery"], getTeamsMembersOfOrg, {
    //refetchOnWindowFocus: "always",
    //refetchOnMount: "always",
    initialData: () => queryClient.getQueryData(["teamsMembersOfOrg"]),
    onSuccess: (data) => {
   //  console.log("Initial Prefetch Members Data:", queryClient.getQueryData(["teamsMembersOfOrg"]));

    // console.log("New fetch Members Data:", data);
    },
  });
}

export function useUpdateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation((values: {memberId: string, body: {role: string}}) => 
  updateRole(values.memberId, values.body), {
    onSuccess: () => {
      notifications.update({
        id: 'load-data',
        color: 'teal',
        title: 'Success',
        message: 'Member Role Updated Successfully!',
        icon: <IconCheck size="1rem" />,
        autoClose: 2000,
      });
      queryClient.invalidateQueries(["orgTeamsDataQuery"]);
    },
    onError: (error: any) => {
      console.error("Error Role Update:", error.message);
      notifications.update({
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