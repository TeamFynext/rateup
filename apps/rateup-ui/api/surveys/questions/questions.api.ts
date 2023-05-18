import { axiosClient } from "../../apiClient";

const QUESTION_URL = "/question";


// TODO: somehow import types from backend?
export async function createQuestion(data) {
    return axiosClient.post(`${QUESTION_URL}`, data)
}
export async function getQuestions(surveyId) {
    if(!surveyId) return []
    const res = await axiosClient.get(`${QUESTION_URL}/all/${surveyId}`)
    return res.data
}

export async function deleteQuestion(questionId) {
    return axiosClient.delete(`${QUESTION_URL}/${questionId}`)
}

export async function reorderQuestions(surveyId: string, newOrder: string[]) {
    return axiosClient.put(`${QUESTION_URL}/reorder/${surveyId}`, newOrder)
}

export async function updateQuestion(questionId: string, data) {
    return axiosClient.put(`${QUESTION_URL}/${questionId}`, data)
}