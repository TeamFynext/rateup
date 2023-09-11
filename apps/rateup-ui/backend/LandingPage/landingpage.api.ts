import { axiosClient } from "../apiClient";
const LANDINGPAGEURL = "/landingpage";
const LANDINGPAGE_PUBLIC_URL = "/public/landingpage";
const SURVEYURL = "/survey";


//---------delete landing page---------
export async function deleteLandingPage(LandingId: string) {
  return await axiosClient.delete(`${LANDINGPAGEURL}/${LandingId}`);
}

export async function getPublicLandingPageSurveys(landingId: string) {
  const res = await axiosClient.get(`${LANDINGPAGE_PUBLIC_URL}/surveys/${landingId}`);
  return res.data;
}
export async function getPublicLandingPage(landingId: string) {
  const res = await axiosClient.get(`${LANDINGPAGE_PUBLIC_URL}/${landingId}`);
  return res.data;
}

export async function updateLandingPage(landingId: string, data) {
  return await axiosClient.put(`${LANDINGPAGEURL}/update/${landingId}`, data);
}