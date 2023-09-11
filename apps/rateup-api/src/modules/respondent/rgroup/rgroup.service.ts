import prisma from "../../../utils/prisma";
import { CreateRGroupInput, UpdateRgroupInput } from "./rgroup.schema";

export async function createRGroupFromPhoneNumbers(input: CreateRGroupInput) {

    const rgroup = await prisma.rGroup.create({
        data: {
            name: input.name,
            teamId: input.teamId
        }
    })

    await prisma.respondent.createMany({
        data: input.data.map((phoneNumber) => ({
            phone: phoneNumber.phone,
            name: phoneNumber.name,
            teamId: input.teamId
        })),
        skipDuplicates: true
    });
    const phoneNumbers = input.data.map((phoneNumber) => phoneNumber.phone);
    const respondents = await prisma.respondent.findMany({
        where: {
            phone: {
                in: phoneNumbers
            }
        }
    });

    await prisma.respondentGroupRelation.createMany({
        data: respondents.map((respondent) => ({
            respondentId: respondent.id,
            rgroupId: rgroup.id
        }))
    })
}

export async function getRGroups(teamIds: string[]) {
    return await prisma.rGroup.findMany({
        where: {
            teamId: {
                in: teamIds
            }
        }
    })
}

export async function getRespondentsByRGroupId(rgroupId: string) {
    const relations = await prisma.respondentGroupRelation.findMany({
        where: {
            rgroupId
        },
        select: {
            respondent: true,
        }
    })

    return relations.map((relation) => relation.respondent);
}

export async function getRGroupSurveyHistory(rgroupId: string) {
    // todo
    return await prisma.rGroupSurveySendHistory.findMany({
        where: {
            rgroupId
        },
        select: {
            id: true,
            surveyId: true,
            createdAt: true,
            survey: {
                select: {
                    title: true
                }
            }
        }
    })
}

export async function createRGroupSurveySendRecord(rgroupId: string, surveyId: string) {
    return await prisma.rGroupSurveySendHistory.create({
        data: {
            rgroupId,
            surveyId
        }
    })
}

export async function deleteRespondentFromRGroup(rgroupId: string, respondentId: string) {
    return await prisma.respondentGroupRelation.deleteMany({
        where: {
            rgroupId,
            respondentId
        }
    })
}

export async function deleteRGroupById(rgroupId: string) {
    return await prisma.rGroup.delete({
        where: {
            id: rgroupId
        }
    })
}

export async function updateRGroup(rgroupId: string, updatedRGroup: UpdateRgroupInput) {
    return await prisma.rGroup.update({
        where: {
            id: rgroupId
        },
        data: updatedRGroup
    })
}

export async function addRespondentsToGroup(rgroupId: string, respondentIds: Array<string>) {
    return await prisma.respondentGroupRelation.createMany({
        data: respondentIds.map((respondentId) => ({
            respondentId,
            rgroupId
        }))
    })
}