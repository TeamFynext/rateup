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

export async function resetResponsesStats(surveyId: string) {
    const deleteResponses = await prisma.surveyResponse.deleteMany({
        where: {
            surveyId,
        }
    });

    const deleteStats = await prisma.surveyStats.deleteMany({
        where: {
            surveyId,
        }
    });

    const deletionMessage = `Deleted.. ${deleteResponses.count} survey responses for survey ID: ${surveyId}`;
    return deletionMessage;
}

export async function deleteResponse(id: string) {
    const deleteResponse = await prisma.surveyResponse.delete({
        where: {
            id,
        }
    });

    return deleteResponse;
}

export async function createResponse(input: CreateResponseInput) {
    const surveyResponse = await prisma.surveyResponse.create({
        data: {
            ...input,
            surveyId: input.surveyId,
            language: input.language,
            responses: input.responses,
        }
    })

    return surveyResponse;
}
interface Location {
    coordinates: {
        latitude: number,
        longitude: number
    },
    city: string,
    state: string,
    country: string
}
export async function updateResponse(responseId: string, data: { ip: string, location: Location }) {
    const response = await prisma.surveyResponse.update({
        where: {
            id: responseId
        },
        data: {
            ip: data.ip,
            location: data.location as any
        }
    })
    return response;
}
