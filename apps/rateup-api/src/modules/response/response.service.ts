import { ResponsePlatform } from "@prisma/client";
import prisma from "../../utils/prisma";
import { CreateResponseInput } from "./response.schema";

import { getSurveyById } from "../survey/survey.service";
import { getOrCreateWaCustomer } from "../whatsapp/customer/waCustomer/waCustomer.service";

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
    let waCustomer = undefined;

    if (input.platform === ResponsePlatform.WHATSAPP) {
        // Create waCustomer with phone number
        const { phone, ...restOfInput } = input;
        input = restOfInput;
        if (!phone) {
            throw new Error("Phone number is required for Whatsapp responses");
        }

        const survey = await getSurveyById(input.surveyId);
        const teamId = survey?.teamId;

        // TODO: get name from whatsapp
        waCustomer = await getOrCreateWaCustomer(teamId, phone);
    }

    const surveyResponse = await prisma.surveyResponse.create({
        data: {
            ...input,
            surveyId: input.surveyId,
            language: input.language,
            responses: input.responses,
            waCustomerId: waCustomer?.id
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
