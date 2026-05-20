import type { PaginationState, SortingState } from "@tanstack/react-table";

import { axiosClient } from "../apiClient";

export interface ICreateGoogleUser {
  name: string;
  orgName: string;
  type: string;
  email?: string;
}

export interface IChangePassword {
  existingPassword: string;
  newPassword: string;
}

export interface IUpdateProfile {
  title: string;
  name: string;
  phone: string;
}

export interface IUpdateUserLanguage {
  prefLanguage: string;
}

export interface IUpdateProfilePhoto {
  profilePhoto: string;
}

export interface IUserData {
  orgId: string;
  role: string;
  userId: string;
  userName: string;
  email: string;
  profilePhoto: string;
  orgName: string;
  orgLogo: string;
  orgPhone: string;
  orgAddress: string;
  teams: Array<string>;
  encryptionKeys: EncryptionKeys | undefined;
  prefLanguage: string;
  showLifecycle: boolean;
}

export interface IUserInfoApiResponse {
  message: string;
  data: UserData;
}
const PUBLICUSER_URL = "/public/user/";

export async function fetchUserInfo() {
  try {
    const response: IUserInfoApiResponse = (await axiosClient.get("/user/info"))
      .data;
    return response;
  } catch (e) {
    return { error: e.response.data }; // TODO: improve error handling for react query
  }
}

export const fetchUserProfile = () =>
  axiosClient({
    url: `/user/profile`,
    method: "GET",
  });

export const updateUserProfile = (data: IUpdateProfile) =>
  axiosClient({
    url: `/user/update-profile`,
    method: "PUT",
    data: data,
  });

export const updateUserLanguage = (data: IUpdateUserLanguage) =>
  axiosClient({
    url: `/user/update-language`,
    method: "PUT",
    data: data,
  });

export const updateUserProfilePhoto = (data: IUpdateProfilePhoto) =>
  axiosClient({
    url: `/user/update-profile-photo`,
    method: "PUT",
    data: data,
  });

export const createGoogleUser = (data) => {
  return axiosClient({
    url: `/user/complete-google-signup`,
    method: "POST",
    data: data,
  });
};

export const createAppleUser = (data) => {
  return axiosClient({
    url: `/user/complete-apple-signup`,
    method: "POST",
    data: data,
  });
};

export const changeUserPassword = (data: IChangePassword) =>
  axiosClient({
    url: `/user/change-password`,
    method: "POST",
    data: data,
  });

// function for soft deleting the user account
export const updateActiveStatus = (userId: string) =>
  axiosClient({
    url: `/user/update-active-status/${userId}`,
    method: "PUT",
  });

export const checkEmailExist = async (data: { email: string }) => {
  const response = await axiosClient({
    url: `${PUBLICUSER_URL}check-email`,
    method: "POST",
    data,
  });
  return response?.data as { success: boolean };
};

export async function getAllUsers() {
  return (await axiosClient.get(`user/all`)).data as Array<UserData>;
}

export async function updateRecipeName() {
  return (await axiosClient.post(`user/update-recipe`)).data;
}

export async function updateUserPause({ userId, data }) {
  return await axiosClient.put(`user/pause/${userId}`, data);
}

export interface IUpdateMemberProfile {
  title: string;
  name: string;
  phone: string;
}

export const updateMemberProfile = (
  userId: string,
  data: IUpdateMemberProfile,
) => axiosClient.put(`user/update-profile/${userId}`, data);

export enum UserAvailabilityStatus {
  offline = "offline",
  online = "online",
  busy = "busy",
}

export enum UserPresenceMode {
  automatic = "automatic",
  manual = "manual",
}

export async function updateUserAvailabilityStatus(data: {
  status: UserAvailabilityStatus;
  presenceMode: UserPresenceMode;
}) {
  return await axiosClient.put(`user/status`, data);
}

export interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export type AuditLog = Record<string, any>;
export interface AuditLogData {
  id: string;
  userId: string;
  user: {
    name: string;
  };
  orgId: string;
  action: string;
  method: string;
  route: string;
  body: any;
  createdAt: string;
  rawCreatedAt: Date;
}
export interface IPaginatedResponse<T> {
  data: AuditLogData[];
  pagination: IPagination;
}

export async function getAuditLogs(params: {
  pagination: PaginationState;
  sorting: SortingState;
}) {
  const sortParams =
    params?.sorting?.length > 0
      ? {
          sortBy: params.sorting?.[0]?.id,
          sortOrder: params.sorting?.[0]?.desc ? "desc" : "asc",
        }
      : {};

  const response = await axiosClient.get<IPaginatedResponse<AuditLog>>(
    `user/audit-logs`,
    {
      params: {
        page: params?.pagination.pageIndex + 1,
        limit: params?.pagination.pageSize,
        ...sortParams,
      },
    },
  );
  return response.data;
}
