import axios from "@/src/config/axios";

const DASHBOARD_URL = "/api/dashboard";

export const getOverallStats = async () => {
  const res = await axios.get(`${DASHBOARD_URL}/stats`);
  return res.data;
};

export const getActiveSurveyStats = async () => {
  const res = await axios.get(`${DASHBOARD_URL}/surveys`);
  return res.data;
};

export const getTeamMemberStats = async (teamId: string) => {
  const res = await axios.get(`${DASHBOARD_URL}/teamStats/${teamId}`);
  return res.data;
};
