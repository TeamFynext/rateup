import { axiosClient } from "../../apiClient";

const QUESTION_URL = "/question";


// TODO: somehow import types from backend?
export async function createQuestion(data) {
    return axiosClient.post(`${QUESTION_URL}`, data)
}
export async function getQuestions(surveyId) {
    const res = await axiosClient.get(`${QUESTION_URL}/all/${surveyId}`)
    return res.data
}

export async function deleteQuestion(questionId) {
    return axiosClient.delete(`${QUESTION_URL}/${questionId}`)
}