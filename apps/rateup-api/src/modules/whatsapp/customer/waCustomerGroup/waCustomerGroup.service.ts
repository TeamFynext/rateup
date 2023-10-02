import prisma from "../../../../utils/prisma";
import { CreateWaCustomerGroupInput, UpdateWaCustomerGroupInput } from "./waCustomerGroup.schema";

export async function createWaCustomerGroupFromPhoneNumbers(input: CreateWaCustomerGroupInput) {

    const waCustomerGroup = await prisma.waCustomerGroup.create({
        data: {
            name: input.name,
            teamId: input.teamId
        }
    })

    await prisma.waCustomer.createMany({
        data: input.data.map((phoneNumber) => ({
            phone: phoneNumber.phone,
            name: phoneNumber.name,
            teamId: input.teamId
        })),
        skipDuplicates: true
    });
    const phoneNumbers = input.data.map((phoneNumber) => phoneNumber.phone);
    const waCustomers = await prisma.waCustomer.findMany({
        where: {
            phone: {
                in: phoneNumbers
            }
        }
    });

    await prisma.waCustomerGroupMap.createMany({
        data: waCustomers.map((waCustomer) => ({
            waCustomerId: waCustomer.id,
            waCustomerGroupId: waCustomerGroup.id
        }))
    })
}

export async function getWaCustomerGroups(teamIds: string[]) {
    return await prisma.waCustomerGroup.findMany({
        where: {
            teamId: {
                in: teamIds
            }
        }
    })
}

export async function getWaCustomersByWaCustomerGroupId(waCustomerGroupId: string) {
    const relations = await prisma.waCustomerGroupMap.findMany({
        where: {
            waCustomerGroupId
        },
        select: {
            waCustomer: true,
        }
    })

    return relations.map((relation) => relation.waCustomer);
}

export async function getWaCustomerGroupSurveyHistory(waCustomerGroupId: string) {
    // todo
    return await prisma.waCustomerGroupSurveySendHistory.findMany({
        where: {
            waCustomerGroupId,
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

export async function createWaCustomerGroupSurveySendRecord(waCustomerGroupId: string, surveyId: string, templateId: string) {
    return await prisma.waCustomerGroupSurveySendHistory.create({
        data: {
            waCustomerGroupId,
            surveyId,
            templateId
        }
    })
}

export async function deleteWaCustomerFromWaCustomerGroup(waCustomerGroupId: string, waCustomerId: string) {
    return await prisma.waCustomerGroupMap.deleteMany({
        where: {
            waCustomerGroupId,
            waCustomerId
        }
    })
}

export async function deleteWaCustomerGroupById(waCustomerGroupId: string) {
    return await prisma.waCustomerGroup.delete({
        where: {
            id: waCustomerGroupId
        }
    })
}

export async function updateWaCustomerGroup(waCustomerGroupId: string, updatedWaCustomerGroup: UpdateWaCustomerGroupInput) {
    return await prisma.waCustomerGroup.update({
        where: {
            id: waCustomerGroupId
        },
        data: updatedWaCustomerGroup
    })
}

export async function addWaCustomersToGroup(waCustomerGroupId: string, waCustomerIds: Array<string>) {
    return await prisma.waCustomerGroupMap.createMany({
        data: waCustomerIds.map((waCustomerId) => ({
            waCustomerId,
            waCustomerGroupId
        }))
    })
}