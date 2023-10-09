import { log } from "../../../utils/logger";
import prisma from "../../../utils/prisma";

// TODO: auth

export async function getRespondent(teamId: string, phone: string) {
    const respondent = await prisma.respondent.findFirst({
        where: {
            phone,
            teamId
        }
    });
    return respondent;
}
/**
 * Returns all respondents from each team
 */
export async function getRespondents(teamIds: string[]) {
    const respondents = await prisma.respondent.findMany({
        where: {
            teamId: {
                in: teamIds
            }
        }
    });
    // TODO: filter duplicate phone numbers?
    return respondents;
}

export async function getRespondentById(id: string) {
    const respondent = await prisma.respondent.findUnique({
        where: {
            id
        }
    });
    return respondent;
}

export async function createRespondent(teamId: string, phone: string, name?: string) {
    const respondent = await prisma.respondent.create({
        data: {
            phone,
            name,
            teamId
        }
    });

    return respondent
}


export async function createRespondents(teamId: string, data: Array<{ phone: string, name?: string }>) {
    try {
        const respondents = await prisma.respondent.createMany({
            data: data.map((respondent) => ({
                phone: respondent.phone,
                name: respondent.name,
                teamId
            }))
        });
        return respondents;
    } catch (e) {
        console.log(e);
    }
}

export async function createRespondentsIndividually(teamId: string, respondents: Array<{ phone: string, name?: string }>) {
    // TODO: figure out how to except duplicate phone number error & continue creating the rest using createMany

    const res = await Promise.allSettled(respondents.map((respondent) => {
        return createRespondent(teamId, respondent.phone, respondent.name)
    }))

    console.log(res)
}

export async function getOrCreateRespondent(teamId: string, phone: string) {
    let respondent = await getRespondent(teamId, phone);
    if (!respondent) {
        respondent = await createRespondent(teamId, phone);
    }

    return respondent;
}

export async function getRespondentSurveyHistory(respondentId: string) {
    const surveyHistory = await prisma.respondentSurveySendHistory.findMany({
        where: {
            respondentId,
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
export async function getRespondentSurveyHistoryByPhone(phone: string, teamIds: string[]) {
    const respondentIds = (await getRespondentsByPhone(phone, teamIds)).map(r => r.id)
    const surveyHistory = await prisma.respondentSurveySendHistory.findMany({
        where: {
            respondentId: {
                in: respondentIds
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
export async function createRespondentSurveySendRecord(respondentId: string, surveyId: string, templateId: string) {
    const record = await prisma.respondentSurveySendHistory.create({
        data: {
            respondentId,
            surveyId,
            templateId
        }
    });
    log.trace(`Created respondent survey send record %o`, record)

    return record;
}

export async function getRespondentResponseHistory(respondentId: string) {
    const responses = await prisma.surveyResponse.findMany({
        where: {
            respondentId
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

export async function updateRespondentById(id: string, respondent: { name?: string }) {
    console.log(respondent)
    const res = await prisma.respondent.update({
        where: {
            id
        },
        data: {
            ...respondent
        }
    });

    return res;
}
/**Returns groups in which the respondent is a member of */
export async function getRGroupsByRespondentId(respondentId: string) {
    const rGroups = await prisma.respondentGroupRelation.findMany({
        where: {
            respondentId
        },
        select: {
            rgroup: true,
        }
    });

    return rGroups.map((rgroup) => rgroup.rgroup);
}
export async function getRGroupsByPhone(phone: string, teams: string[]) {
    const respondentIds = (await getRespondentsByPhone(phone, teams)).map((respondent) => respondent.id);
    const rGroups = await prisma.respondentGroupRelation.findMany({
        where: {
            respondentId: {
                in: respondentIds
            }
        },
        select: {
            rgroup: true,
        }
    });

    return rGroups.map((rgroup) => rgroup.rgroup);
}

export async function getRespondentsByPhone(phone: string, teams: string[]) {
    const respondents = await prisma.respondent.findMany({
        where: {
            phone,
            teamId: {
                in: teams
            }
        }
    });

    return respondents;
}

export async function deleteRespondentById(id: string) {
    const res = await prisma.respondent.delete({
        where: {
            id
        }
    });

    return res;
}