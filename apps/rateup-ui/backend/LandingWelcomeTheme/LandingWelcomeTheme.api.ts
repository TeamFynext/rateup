import { axiosClient } from "../apiClient";
const LANDING_WELCOMETHEME = "/landingtheme";
const LANDING_WELCOMETHEME_PUBLIC_URL = "/public/landingtheme";

export const createLandingWelcomeTheme = (data) =>
  axiosClient.post(`${LANDING_WELCOMETHEME}/create`, data);

export const updateLandingWelcomeTheme = (data) =>
  axiosClient.post(`${LANDING_WELCOMETHEME}/update/${data?.id}`, data);

export async function getLandingWelcomeThemeByLandingId(landingId: string) {
  if (!landingId) return undefined;
  const res = await axiosClient.get(
    `${LANDING_WELCOMETHEME}/landing/${landingId}`
  );
  return res.data;
}

//-------------public urls -------------------
export async function getPublicLandingWelcomeThemeByLandingId(
  LandingWelcomeThemeId: string
) {
  const res = await axiosClient.get(
    `${LANDING_WELCOMETHEME_PUBLIC_URL}/landing/${LandingWelcomeThemeId}`
  );
  return res.data;
}
