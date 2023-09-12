import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IEditTeam, createTeam, editTeam, getTeamsByUser } from "./team.api";
import { getOrgIdRole, getUserID } from "../../utils/userInfo";
import { IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/router";

export function useTeamsByUser(queryClient) {
    return useQuery(["teamsDataUserQuery"], getTeamsByUser, {
      staleTime: 1000 * 60 * 5, // 5 minutes,
      //refetchOnWindowFocus: "always",
      //refetchOnMount: "always",
      initialData: () => queryClient.getQueryData(["teamsByUser"]),
      onSuccess: (data) => {
        //console.log("Initial Prefetch Team Data:", queryClient.getQueryData(["teamsByUser"]));

       // console.log("New fetch Team Data:", data);
      },
    });
}

export function useCreateTeamMutation(
  close : () => void, 
  createTeamForm: any, 
  setIsCreating: React.Dispatch<React.SetStateAction<boolean>>
  ) {
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
      setIsCreating(false)
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
      setIsCreating(false)
    },
  });
}

export function useEditTeamMutation(id, setIsLoading) {
  const queryClient = useQueryClient();
  return useMutation((values: IEditTeam) => editTeam(id, values), {
    onSuccess: () => {
      notifications.show({
        id: 'load-data',
        color: 'teal',
        title: 'Success',
        message: 'Team Details Updated Successfully!',
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      setIsLoading(false)
      queryClient.invalidateQueries(["teamsDetailsQuery"]);
    },
    onError: (error: any) => {
      console.error("Error Team Update:", error.message);
      notifications.show({
        id: 'load-data',
        color: 'red',
        title: 'Failed',
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });

      setIsLoading(false)
    },
  });
}

export function useDeleteTeamMutation(handleDeleteTeam) {
  const queryClient = useQueryClient();
  const router = useRouter();

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
      router.push('/dashboard/teams');

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
  const data = { name: values.name, code: values.code, orgId, userId,whatsappAccessToken: values.whatsappAccessToken };
  return createTeam(data);
}

