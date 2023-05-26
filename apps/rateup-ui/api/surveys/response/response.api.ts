import { axiosClient } from "../../apiClient";

const RESPONSE_URL = "/response";

export async function getResponses(surveyId: string) {
    const res = await axiosClient.get(`${RESPONSE_URL}/${surveyId}`)
    return res.data as Array<SurveyResponse>
}

type CreateResonseType = Omit<SurveyResponse, "id" | "createdAt">
export async function createResponsePublic(data: CreateResonseType) {
    return await axiosClient.post(`/public/response`, data)
}