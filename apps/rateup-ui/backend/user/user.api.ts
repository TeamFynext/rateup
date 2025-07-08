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
}

export interface IUserInfoApiResponse {
  message: string;
  data: UserData;
}
const PUBLICUSER_URL = "/public/user/";

export async function fetchUserInfo() {
  try {
    let response: IUserInfoApiResponse = (await axiosClient.get("/user/info"))
      .data;
    return response as IUserInfoApiResponse;
  } catch (e) {
    return { error: e.response.data }; //TODO: improve error handling for react query
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

export const createGoogleUser = (data: ICreateGoogleUser) =>
  axiosClient({
    url: `/user/complete-google-signup`,
    method: "POST",
    data: data,
  });

export const changeUserPassword = (data: IChangePassword) =>
  axiosClient({
    url: `/user/change-password`,
    method: "POST",
    data: data,
  });

//function for soft deleting the user account
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

export enum UserAvailabilityStatus {
  offline = "offline",
  online = "online",
}

export async function updateUserAvailabilityStatus(data: {
  status: UserAvailabilityStatus;
}) {
  return await axiosClient.put(`user/status`, data);
}
