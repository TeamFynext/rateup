import { axiosClient } from "../apiClient";

const DASHBOARD_URL = "/dashboard";

export const getOverallStats = async () => {
  const res = await axiosClient.get(`${DASHBOARD_URL}/stats`);
  return res.data;
};

export const getActiveSurveyStats = async () => {
  const res = await axiosClient.get(`${DASHBOARD_URL}/surveys`);
  return res.data;
};

export const getTeamMemberStats = async (teamId: string) => {
  const res = await axiosClient.get(`${DASHBOARD_URL}/teamStats/${teamId}`);
  return res.data;
};
