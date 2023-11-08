import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconCheck } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import {
  IChangePassword,
  ICreateGoogleUser,
  IUpdateProfile,
  IUpdateProfilePhoto,
  changeUserPassword,
  createGoogleUser,
  fetchUserProfile,
  updateActiveStatus,
  updateUserProfile,
  updateUserProfilePhoto,
} from "./user.api";
import { useRouter } from "next/router";

export const useGetUserProfile = () =>
  useQuery({
    queryKey: ["userProfile"],
    queryFn: () => fetchUserProfile(),
  });

export function useCreateUserMutation(setIsLoading) {
  const router = useRouter();
  return useMutation({
    mutationFn: (values: ICreateGoogleUser) => handleCreateUser(values),
    onSuccess: () => {
      notifications.show({
        id: "load-data",
        color: "teal",
        title: "Success",
        message: "Sign up process is Complete!",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      setIsLoading(false);
      router.push("/dashboard?msg=welcome");
    },
    onError: (error: any) => {
      console.error("Error completing signup:", error.message);
      notifications.show({
        id: "load-data",
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

async function handleCreateUser(values) {
  return createGoogleUser(values);
}

export function useChangePasswordMutation(setIsLoading) {
  const router = useRouter();
  return useMutation({
    mutationFn: (values: IChangePassword) => changeUserPassword(values),
    onSuccess: () => {
      notifications.show({
        id: "load-data",
        color: "teal",
        title: "Success",
        message: "Password Changed Successfully!",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      setIsLoading(false);
    },
    onError: (error: any) => {
      console.error("Error changed password:", error.message);
      notifications.show({
        id: "load-data",
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

export function useUpdateProfileMutation(setIsLoading) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: IUpdateProfile) => updateUserProfile(values),
    onSuccess: () => {
      notifications.show({
        id: "load-data",
        color: "teal",
        title: "Success",
        message: "Profile Updated Successfully!",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      setIsLoading(false);
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
      queryClient.resetQueries({ queryKey: ["userInfoQuery"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
    onError: (error: any) => {
      console.error("Error Profile Update:", error.message);
      notifications.show({
        id: "load-data",
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

export function useUpdateProfilePhotoMutation(setIsLoadingUpload) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: IUpdateProfilePhoto) => updateUserProfilePhoto(values),
    onSuccess: () => {
      notifications.update({
        id: "load-data",
        color: "teal",
        loading: false,
        title: "Success",
        message: "Profile Photo Updated Successfully!",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      setIsLoadingUpload(false);
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
      queryClient.resetQueries({ queryKey: ["userInfoQuery"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
    onError: (error: any) => {
      console.error("Error Profile photo Update:", error.message);
      notifications.update({
        id: "load-data",
        color: "red",
        loading: false,
        title: "Failed",
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });

      setIsLoadingUpload(false);
    },
  });
}

export function useUpdateActiveStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => updateActiveStatus(userId),
    onSuccess: () => {
      notifications.update({
        id: "load-data",
        color: "teal",
        loading: false,
        title: "Success",
        message: "Member Deleted Successfully!",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
      queryClient.resetQueries({ queryKey: ["userInfoQuery"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["orgTeamsDataQuery"] });
    },
    onError: (error: any) => {
      console.error("Error deleting member", error.message);
      notifications.update({
        id: "load-data",
        color: "red",
        loading: false,
        title: "Failed",
        message: error?.response?.data?.message,
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
    },
  });
}
