import { axiosClient } from '../apiClient'

const SURVEYURL = "/survey"

export const createSurvey = (data) => axiosClient.post(SURVEYURL, data)

export async function getSurveys() {
    try {
        let surveys: Array<Survey> = (await axiosClient.get(SURVEYURL)).data;
        return surveys
    } catch (e) {
        console.error(e)
        return { error: "Error Occured!" }
    }
}
export async function getSurvey(surveyId: string) {
    if(!surveyId) return undefined
    const res =  await axiosClient.get(`${SURVEYURL}/${surveyId}`)
    return res.data as Survey
}
export async function getPublicSurvey(surveyId: string) {
    const res =  await axiosClient.get(`/public/survey/${surveyId}`)
    return res.data as Survey
}
export async function deleteSurvey(surveyId: string) {
    return await axiosClient.delete(`${SURVEYURL}/${surveyId}`)
}
export async function updateSurvey(surveyId: string, data) {
    return await axiosClient.put(`${SURVEYURL}/${surveyId}`, data)
}