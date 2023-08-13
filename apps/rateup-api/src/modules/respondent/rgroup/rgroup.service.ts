import prisma from "../../../utils/prisma";
import { getTeamsByUserId } from "../../team/team.service";
import { createRespondent, getRespondent } from "../respondent/respondent.service";
import { CreateRGroupInput, UpdateRgroupInput } from "./rgroup.schema";


export async function createRGroupFromPhoneNumbers(input: CreateRGroupInput) {

    // TODO: do batch operation & optimize the code
    const { teamId } = input;
    // 1. Gets or creates respondent for each phone number
    const respondentIds = await Promise.all(input.data.map(async ({ phone, name }) => {
        let respondent = await getRespondent(teamId, phone);
        if (!respondent) {
            respondent = await createRespondent(teamId, phone, name)
        }
        return respondent.id;
    }))

    // 2. Creates respondent group
    const rgroup = await prisma.rGroup.create({
        data: {
            name: input.name,
            teamId
        }
    })

    // 3. Creates respondent group relation

    // refer connectOrCreate and optimize the code if possible.
    // https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries#connect-or-create
    await prisma.respondentGroupRelation.createMany({
        data: [
            ...respondentIds.map((respondentId) => ({
                respondentId,
                rgroupId: rgroup.id
            }))
        ]
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