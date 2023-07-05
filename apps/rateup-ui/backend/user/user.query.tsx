import { useMutation } from "@tanstack/react-query";
import { IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { IChangePassword, ICreateGoogleUser, changeUserPassword, createGoogleUser } from "./user.api";
import { useRouter } from "next/router";

export function useCreateUserMutation(setIsLoading) {
  const router = useRouter();
    return useMutation((values : ICreateGoogleUser) => handleCreateUser(values), {
      onSuccess: () => {
        notifications.show({
          id: 'load-data',
          color: 'teal',
          title: 'Success',
          message: 'Sign up process is Complete!',
          icon: <IconCheck size="1rem" />,
          autoClose: 3000,
        });
        setIsLoading(false)
        router.push('/dashboard');
      },
      onError: (error: any) => {
        console.error("Error completing signup:", error.message);
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

  async function handleCreateUser(values) {
    // const { orgId } = await getOrgIdRole();
    // const { userId } = await getUserID();
    // const data = { name: values.name, code: values.code, orgId, userId };
    return createGoogleUser(values);
  }

  export function useChangePasswordMutation(setIsLoading) {
    const router = useRouter();
      return useMutation((values : IChangePassword) => changeUserPassword(values), {
        onSuccess: () => {
          notifications.show({
            id: 'load-data',
            color: 'teal',
            title: 'Success',
            message: 'Password Changed Successfully!',
            icon: <IconCheck size="1rem" />,
            autoClose: 3000,
          });
          setIsLoading(false)
        },
        onError: (error: any) => {
          console.error("Error changed password:", error.message);
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
  