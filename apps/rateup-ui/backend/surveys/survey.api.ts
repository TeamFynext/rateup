import { axiosClient } from "../apiClient";

const SURVEYURL = "/survey";
const SURVEY_PUBLIC_URL = "/public/survey";
const WHATSAPPSURVEYURL = "/whatsappsurvey";

export interface CreateSurveyResponse {
  title: string,
  languages: string[],
  teamId: string,
  active: boolean,
  type: string,
  getLocation: boolean,
  welcomePageEnabled: boolean,
  id: string
}

export async function createSurvey(data) {
  try {
    let res: CreateSurveyResponse = (await axiosClient.post(SURVEYURL, data)).data;
    return res;
  } catch (e) {
    console.error(e);
    return { error: "Error Occured!" };
  }
}

export const createSurveyLandingPage = (data) =>
  axiosClient.post(`${SURVEYURL}/createlanding`, data);

  //-----------update landing page---------
export const updateSurveyLandingPage = (data) =>
  axiosClient.post(`${SURVEYURL}/updatelanding/${data.id}`, data);

export async function cloneSurvey(surveyId: string, teamId: string) {
  if (!surveyId) return undefined;
  const data = {
    teamId: teamId,
  };
  const res = await axiosClient.post(`${SURVEYURL}/clone/${surveyId}`, data);
  return res.data as Survey;
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

export const getSurveysWithCustomToken = async (token: string) => {
  try {
      const response = await axiosClient.get(`${SURVEYURL}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
      });
      return response.data as Array<Survey>
  } catch (error) {
      console.log(error)
      if(error?.response?.data?.message){
        return error?.response?.data?.message;
       }else{
        return {}
       }
  }
}

export async function getActiveSurveysSummary() {
  try {
    let surveysSummary: Array<SurveySummary> = (await axiosClient.get(`${SURVEYURL}/summary/active`)).data;
    return surveysSummary;
  } catch (e) {
    console.error(e);
    return { error: "Error Occured!" };
  }
}

export const getActiveSurveysSummaryWithCustomToken = async (token: string) => {
  try {
      const response = await axiosClient.get(`${SURVEYURL}/summary/active`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
      });
      return response.data as Array<SurveySummary>
  } catch (error) {
     console.log(error)
     if(error.response.data.message){
      return error.response.data.message;
     }else{
      return {}
     }
  }
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
  try {
    let surveys: Array<Survey> = (
      await axiosClient.get(`${SURVEYURL}/whatsappsurveys`)
    ).data;
    return surveys;
  } catch (e) {
    console.error(e);
    return { error: "Error Occured!" };
  }
}

export const getWhatsappSurveysWithCustomToken = async (token: string) => {
  try {
    const surveys: Array<Survey> = (await axiosClient.get(`${SURVEYURL}/whatsappsurveys`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })).data;
    return surveys
  } catch (error) {
    console.log(error)
    if(error?.response?.data?.message){
      return error?.response?.data?.message;
     }else{
      return []
     }
  }
}


export async function getSurvey(surveyId: string) {
  if (!surveyId) return undefined;
  const res = await axiosClient.get(`${SURVEYURL}/${surveyId}`);
  return res.data as Survey;
}

export const getSurveyWithCustomToken = async (token: string, { surveyId }) => {
  try {
    const response = await axiosClient.get(`${SURVEYURL}/${surveyId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data as Survey
  } catch (error) {
    console.log(error)
    if(error?.response?.data?.message){
      return error?.response?.data?.message;
     }else{
      return []
     }
  }
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

export async function getPublicSurvey(surveyId: string) {
  const res = await axiosClient.get(`${SURVEY_PUBLIC_URL}/${surveyId}`);
  return res.data as Survey;
}

export const getPublicSurveyWithCustomToken = async (token: string, { surveyId }) => {
  try {
    const response = await axiosClient.get(`${SURVEY_PUBLIC_URL}/${surveyId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data
  } catch (error) {
    console.log(error)
    if(error?.response?.data?.message){
      return error?.response?.data?.message;
     }else{
      return []
     }
  }
}


export async function getPublicSurveyGoogleLink(surveyId: string) {
  const res = await axiosClient.get(
    `${SURVEY_PUBLIC_URL}/googlelink/${surveyId}`
  );
  return res?.data?.data?.googleLink;
}
export async function deleteSurvey(surveyId: string) {
  return await axiosClient.delete(`${SURVEYURL}/${surveyId}`);
}

export async function updateSurvey(surveyId: string, data) {
  return await axiosClient.put(`${SURVEYURL}/${surveyId}`, data);
}

export async function updateSurveyGoogleLink(surveyId: string, data) {
  return await axiosClient.put(
    `${SURVEYURL}/googlelink-update/${surveyId}`,
    data
  );
}

export async function updateSurveyPassword(surveyId: string, data) {
  return await axiosClient.put(
    `${SURVEYURL}/password-update/${surveyId}`,
    data
  );
}

export async function verifySurveyPassword(surveyId: string, data) {
  return await axiosClient.post(
    `${SURVEY_PUBLIC_URL}/check-password/${surveyId}`,
    data
  );
}

export async function updateSurveyVisited(surveyId: string) {
  return await axiosClient.post(`${SURVEY_PUBLIC_URL}/${surveyId}/visited`);
}

export const updateSurveyVisitedWithCustomToken = async (token: string, surveyId: string) => {
  try {
      const response = await axiosClient.post(`${SURVEY_PUBLIC_URL}/${surveyId}/visited`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
      });
      return response
  } catch (error) {
      console.log(error)
      if(error?.response?.data?.message){
        return error?.response?.data?.message;
       }else{
        return {}
       }
  }
}


export async function updateSurveyStarted(surveyId: string) {
  return await axiosClient.post(`${SURVEY_PUBLIC_URL}/${surveyId}/started`);
}

export const updateSurveyStartedWithCustomToken = async (token: string, surveyId: string) => {
  try {
      const response = await axiosClient.post(`${SURVEY_PUBLIC_URL}/${surveyId}/started`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
      });
      return response
  } catch (error) {
      console.log(error)
      if(error?.response?.data?.message){
        return error?.response?.data?.message;
       }else{
        return {}
       }
  }
}


export async function updateSurveyCompleted(surveyId: string) {
  return await axiosClient.post(`${SURVEY_PUBLIC_URL}/${surveyId}/completed`);
}
