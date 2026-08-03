import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { orgKeys, teamKeys } from "@/backend/org/org.keys";
import type { RequestPayload } from "@/types/api.ts";

import type {
  IChangePassword,
  ICreateGoogleUser,
  IUpdateMemberProfile,
  IUpdateProfile,
  IUpdateProfilePhoto,
  IUpdateUserLanguage,
  UserAvailabilityStatus,
  UserPresenceMode,
} from "./user.api";
import {
  changeUserPassword,
  checkEmailExist,
  createAppleUser,
  createGoogleUser,
  getAuditLogs,
  updateActiveStatus,
  updateMemberProfile,
  updateRecipeName,
  updateUserAvailabilityStatus,
  updateUserLanguage,
  updateUserPause,
  updateUserProfile,
  updateUserProfilePhoto,
} from "./user.api";
import { userKeys } from "./user.keys";
import { allUsersQuery, userInfoQuery, userProfileQuery } from "./user.options";

export const useGetUserProfile = () => useQuery(userProfileQuery());

export const useUserInfo = () => useQuery({ ...userInfoQuery(), notifyOnChangeProps: ["data"] });

export const useGetAllUsers = () => useQuery(allUsersQuery());

export function useCreateUserMutation(setIsLoading: (loading: boolean) => void) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ICreateGoogleUser) => handleCreateUser(values),
    onSuccess: () => {
      toast.success("Sign up process is Complete!", {
        id: "load-data",
      });
      setIsLoading(false);
      queryClient.invalidateQueries({ queryKey: userKeys.info() });
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
      navigate({
        to: "/dashboard",
      });
    },
    onError: (error) => {
      console.error("Error completing signup:", error.message);
      toast.error(error?.message, {
        id: "load-data",
      });

      setIsLoading(false);
    },
  });
}

export function useCreateAppleUserMutation(setIsLoading: (loading: boolean) => void) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ICreateGoogleUser) => handleCreateAppleUser(values),
    onSuccess: () => {
      toast.success("Sign up process is Complete!", {
        id: "load-data",
      });
      setIsLoading(false);
      queryClient.invalidateQueries({ queryKey: userKeys.info() });
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
      navigate({
        to: "/dashboard",
      });
    },
    onError: (error) => {
      console.error("Error completing signup:", error.message);
      toast.error(error?.message, {
        id: "load-data",
      });

      setIsLoading(false);
    },
  });
}

async function handleCreateUser(values: RequestPayload) {
  return createGoogleUser(values);
}

async function handleCreateAppleUser(values: RequestPayload) {
  return createAppleUser(values);
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (values: IChangePassword) => changeUserPassword(values),
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: IUpdateProfile) => updateUserProfile(values),
    onSuccess: () => {
      toast.success("Profile Updated Successfully!", {
        id: "load-data",
      });
      queryClient.invalidateQueries({ queryKey: userKeys.info() });
      queryClient.resetQueries({ queryKey: userKeys.info() });
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
    onError: (error) => {
      console.error("Error Profile Update:", error.message);
      toast.error(error?.message, {
        id: "load-data",
      });
    },
  });
}
export function useUpdateMemberProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: { userId: string; data: IUpdateMemberProfile }) =>
      updateMemberProfile(values.userId, values.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.teamsAll() });
      queryClient.invalidateQueries({ queryKey: orgKeys.teams() });
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating member profile");
    },
  });
}

export function useUpdateUserLanguageMutation(setIsLoading: (loading: boolean) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: IUpdateUserLanguage) => updateUserLanguage(values),
    onSuccess: () => {
      toast.success("Language Updated Successfully!", {
        id: "load-data",
      });
      setIsLoading(false);
      queryClient.invalidateQueries({ queryKey: userKeys.info() });
      queryClient.resetQueries({ queryKey: userKeys.info() });
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
    onError: (error) => {
      console.error("Error updating language:", error.message);
      toast.error(error?.message, {
        id: "load-data",
      });
      setIsLoading(false);
    },
  });
}

export function useUpdateProfilePhotoMutation(setIsLoadingUpload: (uploading: boolean) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: IUpdateProfilePhoto) => updateUserProfilePhoto(values),
    onSuccess: () => {
      toast.success("Profile Photo Updated Successfully!", {
        id: "load-data",
      });
      setIsLoadingUpload(false);
      queryClient.invalidateQueries({ queryKey: userKeys.info() });
      queryClient.resetQueries({ queryKey: userKeys.info() });
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
    },
    onError: (error) => {
      console.error("Error Profile photo Update:", error.message);
      toast.error(error?.message, {
        id: "load-data",
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
      toast.success("Member Deleted Successfully!", {
        id: "load-data",
      });
      queryClient.invalidateQueries({ queryKey: userKeys.info() });
      queryClient.resetQueries({ queryKey: userKeys.info() });
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
      queryClient.invalidateQueries({ queryKey: orgKeys.teams() });
      queryClient.invalidateQueries({ queryKey: orgKeys.teamsAll() });
    },
    onError: (error) => {
      console.error("Error deleting member", error.message);
      toast.error(error?.message, {
        id: "load-data",
      });
    },
  });
}
export function useCheckEmailExistMutation() {
  return useMutation({
    mutationFn: (data: { email: string }) => checkEmailExist(data),
  });
}

// one time use function for updating recipename of the existing users
export function useUpdateRecipeNameMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateRecipeName,
    onSuccess: () => {
      toast.success("updated recipe name", {
        id: "user-recipe",
      });
      queryClient.invalidateQueries({ queryKey: userKeys.all() });
    },
    onError: (error) => {
      toast.error(error?.message || "error in updating recipe name", {
        id: "user-recipe",
      });
    },
  });
}

export const useUpdateUserPause = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUserPause,
    onSuccess: () => {
      toast.success("Pause status has been updated");
      queryClient.invalidateQueries({ queryKey: userKeys.all() });
      queryClient.invalidateQueries({ queryKey: orgKeys.teams() });
      queryClient.invalidateQueries({ queryKey: orgKeys.teamsAll() });
    },
    onError: (error) => {
      toast.error(error?.message || "Error in updating pause status");
    },
  });
};

export const useUpdateUserAvailabilityStatus = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: { status: UserAvailabilityStatus; presenceMode: UserPresenceMode }) => {
      toast.loading("Updating status...", {
        id: "user-status",
      });
      return updateUserAvailabilityStatus(data);
    },
    onSuccess: () => {
      toast.success("Status updated", {
        id: "user-status",
      });
      queryClient.invalidateQueries({ queryKey: userKeys.info() });
      queryClient.invalidateQueries({ queryKey: userKeys.profile() });
      queryClient.invalidateQueries({ queryKey: teamKeys.memberStats() });
    },
    onError: (error) => {
      toast.error(error?.message || "Error in updating status", {
        id: "user-status",
      });
    },
  });
  return { ...mutation, queryClient };
};

export function useUserAuditLogs(pagination: Parameters<typeof getAuditLogs>[0]) {
  return useQuery({
    queryKey: userKeys.auditLogs(pagination),
    queryFn: () => getAuditLogs(pagination),
    placeholderData: keepPreviousData, // don't have 0 rows flash while changing pages/loading next page
  });
}
