import { axiosClient } from "../../apiClient"

const RGROUPURL = '/rgroup'

export const getRGroups = async () => {
  const res = await axiosClient.get(RGROUPURL)
  return res.data
}
export const getRGroupsByTeamId = async (teamId: string) => {
  const res = await axiosClient.get(`${RGROUPURL}/team/${teamId}`)
  return res.data
}

export async function getRGroupSurveySendHistory(rgroupId: string) {
  const res = await axiosClient.get(`${RGROUPURL}/${rgroupId}/history/surveys`)
  return res.data
}

export async function sendSurveyToRGroup(rgroupId: string, surveyId: string, templateId: string) {
  const res = await axiosClient.get(`wa/send/${surveyId}/template/${templateId}/rgroup/${rgroupId}`)
  return res.data
}

export async function createRgroupFromPhoneNumbers(teamId: string, groupName: string, phoneNumbers: Array<{ phone: string, name?: string }>) {
  const res = await axiosClient.post(RGROUPURL, {name: groupName, teamId, data: phoneNumbers})
  return res.data
}
export async function deleteRespondentFromRGroup(rgroupId: string, respondentId: string) {
  const res = await axiosClient.delete(`${RGROUPURL}/${rgroupId}/respondent/${respondentId}`)
  return res.data
}

export async function deleteRGroup(rgroupId: string) {
  const res = await axiosClient.delete(`${RGROUPURL}/${rgroupId}`)
  return res.data
}

export async function getRespondentsByRGroup(rgroupId: string) {
  const res = await axiosClient.get(`${RGROUPURL}/${rgroupId}/respondents`)
  return res.data
}

export async function updateRGroup(rgroupId: string, rgroup: {name: string}) {
  const res = await axiosClient.put(`${RGROUPURL}/${rgroupId}`, rgroup)
  return res.data
}

/**
 * 
 * @param rgroupId 
 * @param respondents Array of respondent ids
 * @returns 
 */
export async function addRespondents(rgroupId: string, respondents: Array<string>) {
  const res = await axiosClient.post(`${RGROUPURL}/${rgroupId}/respondents`, respondents)
  return res.data
}