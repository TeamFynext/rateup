import { axiosClient } from "../apiClient";

export interface ICreateGoogleUser {
  name: string;
  orgName: string;
  inviteCode: string;
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
}

export interface IUserInfoApiResponse {
  message: string;
  data: UserData;
}

export const fetchUserInfo = async (): Promise<IUserInfoApiResponse> => {
  const response = await axiosClient({
    url: "/user/info",
    method: "GET",
  });
  return response.data as IUserInfoApiResponse;
};

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
