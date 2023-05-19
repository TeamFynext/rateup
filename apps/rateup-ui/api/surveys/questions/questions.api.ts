import { axiosClient } from "../../apiClient";

const QUESTION_URL = "/question";


// TODO: somehow import types from backend?
export async function createQuestion(surveyId: string, data) {
    return axiosClient.post(`${QUESTION_URL}/${surveyId}`, data)
}
export async function getQuestions(surveyId) {
    if(!surveyId) return []
    const res = await axiosClient.get(`${QUESTION_URL}/${surveyId}`)
    return res.data
}

export async function deleteQuestion(surveyId: string, questionId: string) {
    return axiosClient.delete(`${QUESTION_URL}/${surveyId}/${questionId}`)
}

export async function reorderQuestions(surveyId: string, newOrder: string[]) {
    return axiosClient.put(`${QUESTION_URL}/${surveyId}/reorder`, newOrder)
}

export async function updateQuestion(surveyId: string, questionId: string, data) {
    return axiosClient.put(`${QUESTION_URL}/${surveyId}/${questionId}`, data)
}