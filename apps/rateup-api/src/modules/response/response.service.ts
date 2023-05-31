import prisma from "../../utils/prisma";
import { CreateResponseInput } from "./response.schema";

export async function getResponses(surveyId: string) {
    const responses = await prisma.surveyResponse.findMany({
        where: {
            surveyId,
        }
    })
    return responses;
}

export async function createResponse(input: CreateResponseInput) {
    const surveyResponse = await prisma.surveyResponse.create({
        data: input
    })
    return surveyResponse;
}