import { axiosClient } from "../../apiClient";

const RESPONDENTURL = "/respondent"

// TODO: add pagination
export async function getAllRespondents() {
  const res = await axiosClient.get(RESPONDENTURL)
  return res.data
}
export async function getRespondentsByTeamId(teamId: string) {
  const res = await axiosClient.get(`${RESPONDENTURL}/team/${teamId}`)
  return res.data
}
export async function getAllRespondentSurveySendHistory(phone: string) {
  const res = await axiosClient.get(`${RESPONDENTURL}/phone/${phone}/history/surveys`)
  return res.data
}
export async function getRespondentSurveySendHistoryByRespondentId(respondentId: string) {
  const res = await axiosClient.get(`${RESPONDENTURL}/${respondentId}/history/surveys`)
  return res.data
}

export async function sendSurveyToRespondent(respondentId: string, surveyId: string) {
  const res = await axiosClient.get(`wa/send/${surveyId}/resp/${respondentId}`)
  return res.data
}
export async function getAllRespondantResponseHistory(phone: string) {
  const res = await axiosClient.get(`${RESPONDENTURL}/phone/${phone}/history/responses`)
  return res.data
}
export async function getRespondentResponseHistoryByRespondentId(respondentId: string) {
  const res = await axiosClient.get(`${RESPONDENTURL}/${respondentId}/history/responses`)
  return res.data
}

export async function createRespondents(respondents: Array<{phone: string, name?: string}>, teamId: string) {
  const res = await axiosClient.post(RESPONDENTURL, {respondents, teamId})
  return res.data
}

export async function updateRespondent(respondentId: string, respondent: {name?: string}) {
  const res = await axiosClient.put(`${RESPONDENTURL}/${respondentId}`, respondent)
  return res.data
}

export async function getAllRGroupsByRespondent(respondentId: string) {
  const res = await axiosClient.get(`${RESPONDENTURL}/${respondentId}/groups`)
  return res.data
}

export async function deleteRespondent(respondentId: string) {
  const res = await axiosClient.delete(`${RESPONDENTURL}/${respondentId}`)
  return res.data
}