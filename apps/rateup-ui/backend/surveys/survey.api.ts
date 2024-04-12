import axios from "axios";
import { AXIOS_TIMEOUT } from "../../utils/constants";
import { axiosClient, axiosClientIP } from "../apiClient";

const SURVEYURL = "/survey";
const SURVEY_PUBLIC_URL = "/public/survey";
const WHATSAPPSURVEYURL = "/whatsappsurvey";

export interface CreateSurveyResponse {
  title: string;
  languages: string[];
  teamId: string;
  active: boolean;
  type: string;
  getLocation: boolean;
  welcomePageEnabled: boolean;
  id: string;
}

export async function createSurvey(data) {
  let res: CreateSurveyResponse = (await axiosClient.post(SURVEYURL, data))
    .data;
  return res;
}

export const createSurveyLandingPage = (data) =>
  axiosClient.post(`${SURVEYURL}/createlanding`, data);

//-----------update landing page---------
export const updateSurveyLandingPage = (data) =>
  axiosClient.post(`${SURVEYURL}/updatelanding/${data.id}`, data);

export async function cloneSurvey(surveyId: string, teamIds: string[]) {
  if (!surveyId) return undefined;
  const data = {
    teamIds: teamIds,
  };
  const res = await axiosClient.post(`${SURVEYURL}/clone/${surveyId}`, data);
  return res.data as Survey;
}

export async function getSurveyTemplates(surveyType) {
  try {
    let surveyTemplates: any = (
      await axiosClient.get(`${SURVEYURL}/templates/${surveyType}`)
    ).data;
    return surveyTemplates;
  } catch (e) {
    console.error(e);
    return { error: "Error Occured!" };
  }
}

export async function getSurveys() {
  try {
    let surveys: Array<Survey> = (await axiosClient.get(SURVEYURL)).data;
    return surveys;
  } catch (e) {
    console.error(e);
    return { error: "Error Occured!" };
  }
}

export async function getSurveyWithQuestions() {
  try {
    let surveys: Array<Survey> = (
      await axiosClient.get(`${SURVEYURL}/all/survey-with-questions`)
    ).data;
    return surveys;
  } catch (e) {
    console.error(e);
  }
}

export async function getActiveSurveysSummary() {
  let surveysSummary: SurveySummaryData = (
    await axiosClient.get(`${SURVEYURL}/summary/active`)
  ).data;
  return surveysSummary;
}

export const getSurveysList = () =>
  axiosClient({
    url: `/survey`,
    method: "GET",
  });
//----------get all survey landings-------------
export async function getSurveyLandings() {
  try {
    let surveyLandings: Array<SurveyLanding> = (
      await axiosClient.get(`${SURVEYURL}/surveylandings`)
    ).data;
    return surveyLandings;
  } catch (e) {
    console.error(e);
    return { error: "Error Occured!" };
  }
}
export async function getSurveysLandingPage() {
  try {
    let surveys: Array<Survey> = (
      await axiosClient.get(`${SURVEYURL}/createlanding`)
    ).data;
    return surveys;
  } catch (e) {
    console.error(e);
    return { error: "Error Occured!" };
  }
}
//----get whatsapp survey list ------------
export async function getWhatsappSurveys() {
  let surveys: Array<Survey> = (
    await axiosClient.get(`${SURVEYURL}/whatsappsurveys`)
  ).data;
  return surveys;
}

export async function getSurvey(surveyId: string) {
  if (!surveyId) return undefined;
  const res = await axiosClient.get(`${SURVEYURL}/${surveyId}`);
  return res.data as Survey;
}

export async function getLandingpage(LandingId: string) {
  if (!LandingId) return undefined;
  const res = await axiosClient.get(`${SURVEYURL}/landingpage/${LandingId}`);
  return res.data as Survey;
}

export async function getSurveyByLandingId(landingid: string) {
  if (!landingid) return undefined;
  const res = await axiosClient.get(`${SURVEYURL}/landingsurveys/${landingid}`);
  return res.data as Survey;
}

type ExtendedSurvey = Survey & {
  googleLink: string;
  reviews: Array<any>;
  webSurveyThemeId: string;
};

export async function getPublicSurvey(surveyId: string) {
  const res = await axiosClientIP.get(`${SURVEY_PUBLIC_URL}/${surveyId}`);
  return res.data as ExtendedSurvey;
}

export async function getPublicSurveyGoogleLink(surveyTeamMapId: string) {
  const res = await axiosClientIP.get(
    `${SURVEY_PUBLIC_URL}/googlelink/${surveyTeamMapId}`,
  );
  return res.data as string;
}

export async function getPhoneNumberFromSurveyTeamMapId(
  surveyTeamMapId: string,
) {
  const res = await axiosClientIP.get(
    `${SURVEY_PUBLIC_URL}/${surveyTeamMapId}/phone`,
  );
  return res.data as { phone: string };
}

export async function deleteSurvey(surveyId: string) {
  return await axiosClient.delete(`${SURVEYURL}/${surveyId}`);
}

//remove a team from survey
export async function deleteSurveyForOneTeam(surveyId: string, teamId: string) {
  const data = {
    teamId: teamId,
  };

  return await axiosClient.delete(`${SURVEYURL}/teamsurvey/${surveyId}`, {
    data,
  });
}

export async function updateSurvey(surveyId: string, data) {
  return await axiosClient.put(`${SURVEYURL}/${surveyId}`, data);
}

export async function updateSurveyGoogleLink(surveyTeamMapId: string, data) {
  return await axiosClient.put(
    `${SURVEYURL}/googlelink-update/${surveyTeamMapId}`,
    data,
  );
}

export async function updateSurveyPassword({ surveyId, password }) {
  const data = { password: password };
  return await axiosClient.put(
    `${SURVEYURL}/password-update/${surveyId}`,
    data,
  );
}

export async function verifySurveyPassword(surveyId: string, data) {
  return await axiosClient.post(
    `${SURVEY_PUBLIC_URL}/check-password/${surveyId}`,
    data,
  );
}

export async function updateSurveyVisited(surveyTeamMapId: string) {
  return await axiosClient.post(
    `${SURVEY_PUBLIC_URL}/${surveyTeamMapId}/visited`,
  );
}

export async function updateSurveyStarted(surveyTeamMapId: string) {
  return await axiosClient.post(
    `${SURVEY_PUBLIC_URL}/${surveyTeamMapId}/started`,
  );
}

export async function updateSurveyCompleted(surveyTeamMapId: string) {
  return await axiosClient.post(
    `${SURVEY_PUBLIC_URL}/${surveyTeamMapId}/completed`,
  );
}

export async function getSurveyStatsBySurveyTeamMapId(surveyTeamMapId: string) {
  const res = await axiosClient.get(
    `${SURVEYURL}/surveyStats/${surveyTeamMapId}`,
  );
  return res.data as STStats;
}
//TODO REMOVE LATER: MYG GIFT VISHU
type generateGiftRes = {
  name: string;
  sumOfInvoiceValues: number;
  image: string;
};
type generateGiftProps = {
  phoneNumber: string;
};
export async function generateGift(data: generateGiftProps) {
  try {
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api${SURVEY_PUBLIC_URL}/generateGiftByPhone`,
      data,
    );
    return res.data as generateGiftRes;
  } catch (error) {
    if (error?.code === "ECONNABORTED") {
      throw Error(AXIOS_TIMEOUT);
    } else if (error?.response?.data?.message) {
      throw Error(error?.response?.data?.message);
    } else if (typeof error?.response?.data === "string") {
      throw Error(error?.response?.data);
    } else {
      throw Error("There was an error, please try again later");
    }
  }
}
export type Invoice = {
  gift: string | null;
  giftRedeemed: boolean;
  id: string;
  invoiceBranch: string;
  invoiceDate: string;
  invoiceNumber: string;
  invoiceValue: number;
  mobileNumber: string;
  redeemAttempt: number;
  invoiceDiscount: number;
};

export async function getInvoicesByPhNo(phoneNumber: string) {
  try {
    const res = await axiosClient.get(
      `${SURVEY_PUBLIC_URL}/invoices/${phoneNumber}`,
    );
    console.log(res.data, "res-data");

    return res.data as Invoice[];
  } catch (error) {
    if (error?.code === "ECONNABORTED") {
      throw Error(AXIOS_TIMEOUT);
    } else if (error?.response?.data?.message) {
      throw Error(error?.response?.data?.message);
    } else if (typeof error?.response?.data === "string") {
      throw Error(error?.response?.data);
    } else {
      throw Error("There was an error, please try again later");
    }
  }
}
