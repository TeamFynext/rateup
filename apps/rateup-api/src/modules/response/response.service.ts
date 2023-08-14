import { ResponsePlatform } from "@prisma/client";
import prisma from "../../utils/prisma";
import { CreateResponseInput } from "./response.schema";
import { getOrCreateRespondent } from "../respondent/respondent/respondent.service";
import { getSurveyById } from "../survey/survey.service";

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

export async function createResponse(input: CreateResponseInput) {
    let respondent = undefined;

    if (input.platform === ResponsePlatform.WHATSAPP) {
        // Create respondent with phone number
        const { phone, ...restOfInput } = input;
        input = restOfInput;
        if (!phone) {
            throw new Error("Phone number is required for Whatsapp responses");
        }

        const survey = await getSurveyById(input.surveyId);
        const teamId = survey?.teamId;

        // TODO: get name from whatsapp
        respondent = await getOrCreateRespondent(teamId, phone);
    }

    const surveyResponse = await prisma.surveyResponse.create({
        data: {
            surveyId: input.surveyId,
            language: input.language,
            responses: input.responses,

            // TODO: is the rebase correct?
            ...input,
            respondentId: respondent?.id
        }
    })

    return surveyResponse;
}
