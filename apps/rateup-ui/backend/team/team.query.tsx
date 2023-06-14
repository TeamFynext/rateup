import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTeam, getTeamsByUser } from "./team.api";
import { getOrgIdRole, getUserID } from "../../utils/userInfo";
import { IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

export function useTeamsByUser(queryClient) {
    return useQuery(["teamsDataUserQuery"], getTeamsByUser, {
      refetchOnWindowFocus: "always",
      refetchOnMount: "always",
      initialData: () => queryClient.getQueryData(["teamsByUser"]),
      onSuccess: (data) => {
        console.log("Initial Prefetch Data:", queryClient.getQueryData(["teamsByUser"]));

        console.log("New fetch Data:", data);
      },
    });
}

export function useCreateTeamMutation(close, createTeamForm) {
  const queryClient = useQueryClient();
  return useMutation((values) => handleCreateTeam(values), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamsDataUserQuery'] }),
      notifications.update({
        id: 'load-data',
        color: 'teal',
        title: 'Success',
        message: 'Team created successfully.',
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      close()
      createTeamForm.reset();
    },
    onError: (error: any) => {
      console.error("Error creating the post:", error.message);
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

export function useDeleteTeamMutation(handleDeleteTeam, setDeleteTeamId, close, reftchTeams) {
  const queryClient = useQueryClient();
  return useMutation(() => handleDeleteTeam(), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamsDataUserQuery'] }),
      notifications.update({
        id: 'load-data',
        color: 'teal',
        title: 'Delete Success',
        message: 'Team deleted successfully.',
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      close();
      reftchTeams();
      setDeleteTeamId('');
    },
    onError: (error : any) => {
      console.error("Error :", error.message);
      notifications.update({
        id: 'load-data',
        color: 'red',
        title: 'Failed',
        message: error.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
  });
}


async function handleCreateTeam(values) {
  const { orgId } = await getOrgIdRole();
  const { userId } = await getUserID();
  const data = { name: values.name, code: values.code, orgId, userId };
  return createTeam(data);
}

