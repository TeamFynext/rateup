import { useRouter } from "next/navigation";

import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "../../utils/notifications";
import {
  changeUserPassword,
  checkEmailExist,
  createGoogleUser,
  fetchUserInfo,
  fetchUserProfile,
  getAllUsers,
  IChangePassword,
  ICreateGoogleUser,
  IUpdateProfile,
  IUpdateProfilePhoto,
  IUpdateUserLanguage,
  updateActiveStatus,
  updateRecipeName,
  updateUserAvailabilityStatus,
  updateUserLanguage,
  updateUserPause,
  updateUserProfile,
  updateUserProfilePhoto,
  UserAvailabilityStatus,
} from "./user.api";

export const useGetUserProfile = () =>
  useQuery({
    queryKey: ["userProfile"],
    queryFn: () => fetchUserProfile(),
  });

export const useUserInfo = () =>
  useQuery({
    queryKey: ["userInfoQuery"],
    queryFn: fetchUserInfo,
    notifyOnChangeProps: ["data"],
  });

export const useGetAllUsers = () =>
  useQuery({
    queryKey: ["allUsers"],
    queryFn: getAllUsers,
  });

export function useCreateUserMutation(setIsLoading) {
  const router = useRouter();
  const queryClient = useQueryClient();
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
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
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

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (values: IChangePassword) => changeUserPassword(values),
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

export function useUpdateUserLanguageMutation(setIsLoading) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: IUpdateUserLanguage) => updateUserLanguage(values),
    onSuccess: () => {
      notifications.show({
        id: "load-data",
        color: "teal",
        title: "Success",
        message: "Language Updated Successfully!",
        icon: <IconCheck size="1rem" />,
        autoClose: 3000,
      });
      setIsLoading(false);
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
      queryClient.resetQueries({ queryKey: ["userInfoQuery"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
    onError: (error: any) => {
      console.error("Error updating language:", error.message);
      notifications.show({
        id: "load-data",
        color: "red",
        title: "Failed",
        message: error?.response?.data?.message,
        icon: <IconX size="1rem" />,
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
export function useCheckEmailExistMutation() {
  return useMutation({
    mutationFn: (data: { email: string }) => checkEmailExist(data),
  });
}

//one time use function for updating recipename of the existing users
export function useUpdateRecipeNameMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateRecipeName,
    onSuccess: () => {
      showSuccessToast(
        "updated recipe name",
        "user-recipe",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
    },
    onError: () => {
      showErrorToast(
        "error in updating recipe name",
        "user-recipe",
        <IconX />,
        true,
      );
    },
  });
}

export const useUpdateUserPause = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUserPause,
    onSuccess: () => {
      showSuccessToast("Pause status has been updated");
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      queryClient.invalidateQueries({ queryKey: ["orgTeamsDataQuery"] });
    },
    onError: () => {
      showErrorToast("Error in updating pause status");
    },
  });
};

export const useUpdateUserAvailabilityStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { status: UserAvailabilityStatus }) => {
      showLoadingToast("Updating status...", "user-status", true, "Updating");
      return updateUserAvailabilityStatus(data);
    },
    onSuccess: () => {
      showSuccessToast("Status updated", "user-status", <IconCheck />, true);
      queryClient.invalidateQueries({ queryKey: ["userInfoQuery"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["team-member-stats"] });
    },
    onError: () => {
      showErrorToast(
        "Error in updating status",
        "user-status",
        <IconX />,
        true,
      );
    },
  });
};
