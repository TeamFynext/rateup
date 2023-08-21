import { axiosClient } from "../apiClient";
const LANDINGPAGEURL = "/landingpage";



//---------delete landing page---------
export async function deleteLandingPage(LandingId: string) {
  return await axiosClient.delete(`${LANDINGPAGEURL}/${LandingId}`);
}