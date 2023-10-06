import { axiosClient } from "../apiClient";

export const getTeamsMembersOfOrg = () =>
  axiosClient({
    url: `/org/members`,
    method: "GET",
  });

export const getSurveyWithCustomToken = async (token: string) => {
  try {
    const response = await axiosClient.get(`/org/members`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.log(error);
    if (error?.response?.data?.message) {
      return error?.response?.data?.message;
    } else {
      return [];
    }
  }
};

export interface IUpdateRole {
  role: string;
}

export interface IUpdateLogo {
  logo: string;
}

export const updateRole = (memberId: string, data: IUpdateRole) =>
  axiosClient({
    url: `/org/members/change-role/${memberId}`,
    method: "PUT",
    data: data,
  });

export const updateOrgLogo = (data: IUpdateLogo) =>
  axiosClient({
    url: `/org/update-logo`,
    method: "PUT",
    data: data,
  });
