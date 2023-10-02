

// TODO: auth

import { log } from "../../../../utils/logger";
import prisma from "../../../../utils/prisma";

export async function getWaCustomer(teamId: string, phone: string) {
    const waCustomer = await prisma.waCustomer.findFirst({
        where: {
            phone,
            teamId
        }
    });
    return waCustomer;
}
/**
 * Returns all waCustomers from each team
 */
export async function getWaCustomers(teamIds: string[]) {
    const waCustomers = await prisma.waCustomer.findMany({
        where: {
            teamId: {
                in: teamIds
            }
        }
    });
    // TODO: filter duplicate phone numbers?
    return waCustomers;
}

export async function getWaCustomerById(id: string) {
    const waCustomer = await prisma.waCustomer.findUnique({
        where: {
            id
        }
    });
    return waCustomer;
}

export async function createWaCustomer(teamId: string, phone: string, name?: string) {
    const waCustomer = await prisma.waCustomer.create({
        data: {
            phone,
            name,
            teamId
        }
    });

    return waCustomer
}


export async function createWaCustomers(teamId: string, data: Array<{ phone: string, name?: string }>) {
    try {
        const waCustomers = await prisma.waCustomer.createMany({
            data: data.map((waCustomer) => ({
                phone: waCustomer.phone,
                name: waCustomer.name,
                teamId
            }))
        });
        return waCustomers;
    } catch (e) {
        console.log(e);
    }
}

export async function createWaCustomersIndividually(teamId: string, waCustomers: Array<{ phone: string, name?: string }>) {
    // TODO: figure out how to except duplicate phone number error & continue creating the rest using createMany

    const res = await Promise.allSettled(waCustomers.map((waCustomer) => {
        return createWaCustomer(teamId, waCustomer.phone, waCustomer.name)
    }))

    console.log(res)
}

export async function getOrCreateWaCustomer(teamId: string, phone: string) {
    let waCustomer = await getWaCustomer(teamId, phone);
    if (!waCustomer) {
        waCustomer = await createWaCustomer(teamId, phone);
    }

    return waCustomer;
}

export async function getWaCustomerSurveyHistory(waCustomerId: string) {
    const surveyHistory = await prisma.waCustomerSurveySendHistory.findMany({
        where: {
            waCustomerId,
        },
        include: {
            survey: {
                select: {
                    title: true
                }
            }
        }
    });

    return surveyHistory;
}
/** Returns all survey send-records across all teams provided */
export async function getWaCustomerSurveyHistoryByPhone(phone: string, teamIds: string[]) {
    const waCustomerIds = (await getWaCustomersByPhone(phone, teamIds)).map(r => r.id)
    const surveyHistory = await prisma.waCustomerSurveySendHistory.findMany({
        where: {
            waCustomerId: {
                in: waCustomerIds
            },
            survey: {
                teamId: {
                    in: teamIds
                }
            }
        },
        include: {
            survey: {
                select: {
                    title: true
                }
            }
        }
    });

    return surveyHistory;
}
export async function createWaCustomerSurveySendRecord(waCustomerId: string, surveyId: string, templateId: string) {
    const record = await prisma.waCustomerSurveySendHistory.create({
        data: {
            waCustomerId,
            surveyId,
            templateId
        }
    });
    log.trace(`Created waCustomer survey send record %o`, record)

    return record;
}

export async function getWaCustomerResponseHistory(waCustomerId: string) {
    const responses = await prisma.surveyResponse.findMany({
        where: {
            waCustomerId
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

    return responses;
}

export async function updateWaCustomerById(id: string, waCustomer: { name?: string }) {
    console.log(waCustomer)
    const res = await prisma.waCustomer.update({
        where: {
            id
        },
        data: {
            ...waCustomer
        }
    });

    return res;
}
/**Returns groups in which the waCustomer is a member of */
export async function getWaCustomerGroupsByWaCustomerId(waCustomerId: string) {
    const waCustomerGroups = await prisma.waCustomerGroupMap.findMany({
        where: {
            waCustomerId
        },
        select: {
            waCustomerGroup: true,
        }
    });

    return waCustomerGroups.map((customerGroupMap) => customerGroupMap.waCustomerGroup);
}
export async function getWaCustomerGroupsByPhone(phone: string, teams: string[]) {
    const waCustomerIds = (await getWaCustomersByPhone(phone, teams)).map((waCustomer) => waCustomer.id);
    const waCustomerGroups = await prisma.waCustomerGroupMap.findMany({
        where: {
            waCustomerId: {
                in: waCustomerIds
            }
        },
        select: {
            waCustomerGroup: true,
        }
    });

    return waCustomerGroups.map((customerGroupMap) => customerGroupMap.waCustomerGroup);
}

export async function getWaCustomersByPhone(phone: string, teams: string[]) {
    const waCustomers = await prisma.waCustomer.findMany({
        where: {
            phone,
            teamId: {
                in: teams
            }
        }
    });

    return waCustomers;
}

export async function deleteWaCustomerById(id: string) {
    const res = await prisma.waCustomer.delete({
        where: {
            id
        }
    });

    return res;
}