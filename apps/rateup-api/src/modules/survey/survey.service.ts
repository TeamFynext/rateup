import prisma, { excludeFields } from "../../utils/prisma.js";
import {
  CreateSurveyInput,
  DeleteTeamSurveyInput,
  surveyVariableInput,
  surveyVariableUpdateInput,
  UpdateGoogleLinkInput,
  UpdateSurveyInput,
  UpdateSurveyPassword,
} from "./survey.schema.js";
import { getTeamById, getTeamIdsByUserId } from "../team/team.service.js";
import {
  PageType,
  QuestionType,
  SubscriptionFeaturePathName,
  SurveyType,
  SurveyVariableType,
  WaQuestions,
} from "../../types/enums.js";
import { getShortUrlId, shortIdUniqueConstraintErrHandler } from "../../utils/commonUtils.js";
import { defaultVariablesForQuestion, getSurveysOrgId, isShortId } from "./survey.utils.js";
import cloneDeep from "lodash/cloneDeep.js";
import {
  getInitialSurveyQuestions,
  getQuestionsArrUpdatedWithLanguageTypeQuestion,
} from "../question/question.utils.js";
import { defaultWebSurveyPagesTheme } from "../surveyTheme/defaultTheme.js";
import { hasFeature } from "../subscription/subscription.service.js";
import { updateQuestionsOnSurvey } from "../question/question.service.js";
import { createStats } from "../stats/stats.service.js";
import dayjs from "dayjs";
import { Prisma } from "../../../generated/prisma/client.js";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { barGraphQuestions, barGraphQuestions2 } from "../../utils/enumMap.js";

dayjs.extend(utc);
dayjs.extend(timezone);

// TODO: fix return type
// should throw error on error instead of returning error message as string
export async function createSurvey(
  data: CreateSurveyInput & { orgId: string },
  req: { user?: { userId?: string; email?: string; orgId?: string } },
) {
  const { userId: createdBy, email: notificationEmail, orgId } = req?.user || {};
  if (!createdBy || !notificationEmail) {
    throw new Error("createSurvey requires an authenticated user");
  }

  const { templateId, selectedTheme, teamIds, ...input } = data;

  if (templateId) {
    return cloneSurvey(templateId, createdBy, teamIds, true);
  } else {
    const createRecord = async () => {
      const teamsToCreate = teamIds?.map((teamId) => {
        return {
          teamId,
          shortUrlId: getShortUrlId(),
        };
      });

      // Only needed as a fallback when no theme was explicitly selected — looking it
      // up unconditionally and destructuring it (as the code used to) meant creating a
      // survey with an explicit selectedTheme still crashed if the org happened to be
      // missing a "Default Theme" row, even though defaultTheme was never going to be used.
      const defaultTheme = await prisma.webSurveyTheme.findFirst({
        where: {
          orgId,
          name: "Default Theme",
        },
      });

      const survey = await prisma.survey.create({
        data: {
          ...input,
          title: input.title,
          languages: input.languages,
          notificationEmail,
          createdBy,
          teams: {
            create: teamsToCreate,
          },
          webSurveyThemeId: selectedTheme || defaultTheme?.id,
          questions: getInitialSurveyQuestions(input.languages),
          webSurveyPagesTheme: defaultWebSurveyPagesTheme,
        },
      });
      return survey;
    };

    const survey = await shortIdUniqueConstraintErrHandler(createRecord);
    if (survey) {
      if (teamIds.length > 0) {
        const team = await getTeamById(teamIds[0]);
        if (!team) {
          throw new Error(`Team not found: ${teamIds[0]}`);
        }
        const incrementCount =
          survey?.type === SurveyType.Web
            ? { surveysCount: { increment: 1 } }
            : { waSurveysCount: { increment: 1 } };
        await prisma.usageStats.update({
          where: { orgId: team.orgId },
          data: incrementCount,
        });
      }

      return { ...survey, teamIds };
    }
    return null;
  }
}

export async function cloneSurvey(
  surveyId: string,
  userId: string,
  teamIds: string[],
  fromTemplate: boolean = false,
) {
  const survey = await prisma.survey.findUnique({
    where: {
      id: surveyId,
    },
  });

  if (survey) {
    const { id: _id, ...surveyWithoutId } = survey;

    const existingSurveys = await prisma.survey.findMany({
      where: {
        AND: [
          {
            title: {
              startsWith: survey.title,
            },
          },
        ],
      },
      orderBy: {
        title: "asc",
      },
    });

    let maxCopyNumber = 0;

    existingSurveys.forEach((existingSurvey) => {
      const suffix = existingSurvey.title.slice(survey.title.length);
      if (suffix.startsWith(" Copy ")) {
        const copyNumberStr = suffix.slice(" Copy ".length);
        const copyNumber = parseInt(copyNumberStr, 10);
        console.log(
          `Suffix: '${suffix}', Copy number string: ${copyNumberStr}, Copy number: ${copyNumber}`,
        );
        if (!isNaN(copyNumber)) {
          maxCopyNumber = Math.max(maxCopyNumber, copyNumber);
          console.log("Found a valid copy number: ", maxCopyNumber);
        }
      }
    });

    const teams = teamIds?.map((teamId) => ({
      teamId,
      shortUrlId: getShortUrlId(),
    }));

    const clonedUpdatedAt: Date | null = null;
    const clonedSurvey = {
      ...surveyWithoutId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: clonedUpdatedAt,
      title: fromTemplate
        ? survey.title.replace(/^.+__/, "")
        : `${survey.title} Copy ${maxCopyNumber + 1}`,
      teams: {
        create: teams,
      },
    };

    const createClonedSurvey = async () => {
      const cloned = await prisma.survey.create({
        data: clonedSurvey,
        include: {
          teams: true,
        },
      });
      return cloned;
    };
    const newClonedSurvey = await shortIdUniqueConstraintErrHandler(createClonedSurvey);

    if (newClonedSurvey && teamIds.length > 0) {
      const team = await getTeamById(teamIds[0]);
      if (!team) {
        throw new Error(`Team not found: ${teamIds[0]}`);
      }
      await createStats(team.orgId);
    }

    return newClonedSurvey;
  } else {
    return "Survey not found to duplicate";
  }
}

//-----------get single survey with id -------

export async function getSurveyById(id: string, teamIds?: Array<string>) {
  if (!id) {
    throw new Error("ID must be provided");
  }
  const survey = await prisma.survey.findUnique({
    where: {
      id,
    },
    include: {
      teams: {
        where: {
          teamId: {
            in: teamIds,
          },
        },
        include: {
          team: true,
        },
      },
      webSurveyTheme: true,
    },
  });

  if (!survey) {
    throw new Error(`Could not find survey with id ${id}`);
  }

  let teams = survey?.teams?.map((team) => {
    const teamData = {
      id: team?.team?.id,
      name: team?.team?.name,
      mapId: team?.id,
      code: team.team.code,
      tags: team.team.tags,
      shortUrlId: team.shortUrlId,
    };
    return teamData;
  });

  //check googlereview
  const surveyOrgId = survey.orgId ?? survey.webSurveyTheme?.orgId;
  if (!surveyOrgId) {
    throw new Error(`Could not resolve orgId for survey ${id}`);
  }
  if (!(await hasFeature(surveyOrgId, SubscriptionFeaturePathName.GoogleReview))) {
    const questions = [...survey.questions];
    questions.forEach((question) => {
      question.googleReview = null;
    });
    await updateQuestionsOnSurvey(id, questions);
  }
  return { ...survey, teams: teams };
  //return survey;
}

//-----------get public survey with org logo -------

// This function returns survey from SurveyTeamMap Table, below argument id means SurveyTeamMap Table id
export async function getPublicSurveyById(id: string) {
  // id.length === 8 means it is shortUrlId.
  const surveyTeamMapWhere = id.length === 8 ? { shortUrlId: id } : { id };
  const surveyTeamMap = await prisma.surveyTeamMap.findUnique({
    where: surveyTeamMapWhere,
    include: {
      survey: {
        include: {
          webSurveyTheme: true,
        },
      },
      team: true,
    },
  });

  if (!surveyTeamMap) {
    throw new Error(`Could not find survey with id ${id}`);
  }

  const surveyTeamMapId = surveyTeamMap.id;

  let org = await prisma.team.findUnique({
    where: {
      id: surveyTeamMap?.teamId,
    },
    include: {
      org: true,
    },
  });

  let orgLogo = { orgLogo: org?.org?.logo, orgName: org?.org?.name };

  //check googlereview
  const surveyOrgId = surveyTeamMap.survey.orgId ?? surveyTeamMap.survey.webSurveyTheme?.orgId;
  if (!surveyOrgId) {
    throw new Error(`Could not resolve orgId for survey ${surveyTeamMap.surveyId}`);
  }
  if (!(await hasFeature(surveyOrgId, SubscriptionFeaturePathName.GoogleReview))) {
    const questions = [...surveyTeamMap.survey.questions];
    questions.forEach((question) => {
      question.googleReview = null;
    });
    await updateQuestionsOnSurvey(surveyTeamMap.surveyId, questions);
  }

  let publicSurvey = {
    surveyTeamMapId,
    ...surveyTeamMap.survey,
    reviewPageLinks: surveyTeamMap.team.reviewPageLinks,
    ...orgLogo,
  };

  return publicSurvey;
}

export async function getPhoneBySurveyTeamMapId(id: string) {
  const surveyTeamMapWhere = isShortId(id) ? { shortUrlId: id } : { id };
  const surveyTeamMap = await prisma.surveyTeamMap.findUnique({
    where: surveyTeamMapWhere,
    select: {
      team: {
        select: {
          org: {
            select: {
              WhatsappSettings: {
                select: {
                  phone: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return surveyTeamMap?.team?.org?.WhatsappSettings?.[0]?.phone;
}

//---------------get lnding page by landingId------------
export async function getSurveyBylandingId(landingid: string) {
  const Landingpages = await prisma.surveyLanding.findUnique({
    where: {
      id: landingid,
    },
  });

  if (!Landingpages || Landingpages.surveys.length === 0) {
    throw new Error(`Could not find survey with id ${landingid}`);
  }

  //-------------form array if survey ids ---------
  const surveyIds: string[] = [...Landingpages.surveys];

  //----------get surveys from surveyids------------
  const surveyResponse = await prisma.survey.findMany({
    where: {
      id: {
        in: surveyIds,
      },
    },
  });
  return surveyResponse;
}

//------------get ALL Surveys list of a logged user (without qns)--------

export async function getSurveysByUserId(
  userId: string,
  includeQuestions: boolean = false,
  includeResponse: boolean = false,
) {
  const teamIds: string[] = await getTeamIdsByUserId(userId);

  const surveyRes = await prisma.survey.findMany({
    where: {
      teams: {
        some: {
          teamId: {
            in: teamIds,
          },
        },
      },
    },
    select: {
      id: true,
      type: true,
      title: true,
      active: true,
      createdAt: true,
      questions: includeQuestions,
      isPublished: true,
      webSurveyPagesTheme: true,
      teams: {
        select: {
          id: true,
          teamId: true,
          shortUrlId: true,
          team: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              responses: includeResponse,
            },
          },
        },
      },
    },
  });

  let surveyTeamOptimized = surveyRes.map((survey) => {
    const optimizedTeams = survey.teams.map((team) => {
      return {
        id: team.teamId,
        name: team.team.name,
        mapId: team.id,
        shortUrlId: team.shortUrlId,
        responsesCount: team._count,
      };
    });
    return { ...survey, teams: optimizedTeams };
  });

  return surveyTeamOptimized;
}

//------------get web survey list --------
export async function getWebSurveysByUserId(userId: string) {
  const teamIds = await getTeamIdsByUserId(userId);
  const surveyTeamMaps = await prisma.surveyTeamMap.findMany({
    where: {
      teamId: {
        in: teamIds,
      },
    },
    include: {
      survey: true,
    },
  });

  const allSurveys = surveyTeamMaps?.map((surveyTeamMap) => {
    const survey = { ...surveyTeamMap.survey, teamId: surveyTeamMap.teamId };
    return excludeFields(survey, ["questions", "password"]);
  });

  const webSurveys = allSurveys.filter((survey) => survey?.type === "web");
  return webSurveys;
}

//------------get whatsapp survey list --------
export async function getWhatsappSurveysByUserId(userId: string, type: string) {
  const teamIds: string[] = await getTeamIdsByUserId(userId);

  const surveyTeamMaps = await prisma.surveyTeamMap.findMany({
    where: {
      teamId: {
        in: teamIds,
      },
    },
    include: {
      survey: true,
    },
  });

  const allSurveys = surveyTeamMaps?.map((surveyTeamMap) => {
    const survey = { ...surveyTeamMap.survey, teamId: surveyTeamMap.teamId };
    return excludeFields(survey, ["questions", "password"]);
  });

  const whatsAppSurveys = allSurveys.filter((survey) => survey?.type === type);
  return whatsAppSurveys;
}

//------------get survey landing survey list --------
export async function getSurveyLandingByUserId(userId: string) {
  const surveysLanding = await prisma.surveyLanding.findMany({
    where: { createdBy: userId },
  });

  return surveysLanding;
}

//------------get survey list  by team id --------
export async function getSurveysByTeam(teamId: string) {
  const surveyTeamMaps = await prisma.surveyTeamMap.findMany({
    where: {
      teamId,
    },
    include: {
      survey: true,
    },
  });

  const surveysWithoutQuestions = surveyTeamMaps?.map((surveyTeamMap) => {
    const survey = {
      ...surveyTeamMap.survey,
      surveyTeamMapId: surveyTeamMap.id,
    };
    return excludeFields(survey, ["questions", "password"]);
  });

  return surveysWithoutQuestions;
}

export async function getSurveyStatsBySurveyTeamMapId(surveyTeamMapId: string) {
  const surveyStats = await prisma.surveyStats.findUnique({
    where: {
      surveyTeamMapId,
    },
  });
  return surveyStats;
}

export async function getSurveyStats(surveyId: string, teamIds: string[]) {
  const surveyStats = await prisma.surveyStats.findMany({
    where: {
      surveyTeamMap: {
        surveyId,
        teamId: {
          in: teamIds,
        },
      },
    },
  });
  return surveyStats;
}

export async function getSurveyByTeamMapId(surveyTeamMapId: string) {
  const teamMap = await prisma.surveyTeamMap.findUnique({
    where: {
      id: surveyTeamMapId,
    },
    include: {
      survey: true,
    },
  });
  if (!teamMap) {
    throw new Error(`Could not find survey team map with id ${surveyTeamMapId}`);
  }
  return teamMap.survey;
}

//------------SURVEY SUMMARY  ----
//-----Returns summary(responses, stats) of active  and stopped surveys -- from ALL TEAMs in which the user is a member of

export async function getActiveSurveysSummmaryByUserId(userId: string) {
  const teamIds = await getTeamIdsByUserId(userId);
  const allSurveys = await prisma.survey.count({
    where: {
      teams: {
        some: {
          teamId: {
            in: teamIds,
          },
        },
      },
    },
  });
  const activeSurveys = await prisma.survey.findMany({
    where: {
      teams: {
        some: {
          teamId: {
            in: teamIds,
          },
        },
      },
      active: true,
    },
    select: {
      id: true,
      type: true,
      isPublished: true,
      active: true,
      title: true,
      teams: {
        select: {
          id: true,
          responses: {
            select: {
              id: true,
              createdAt: true,
            },
          },
          surveyStats: {
            select: {
              started: true,
              completed: true,
              visited: true,
            },
          },
          team: {
            select: {
              name: true,
              id: true,
            },
          },
        },
      },
      WaFlow: {
        select: {
          dbFlowId: true,
          version: true,
        },
      },
    },
  });
  const data = activeSurveys?.map((survey) => {
    const surveys = {
      ...survey,
      teamMapIds: survey.teams.map((team) => ({
        teamMapId: team.id,
        teamName: team.team.name,
        teamId: team.team.id,
      })),
      teams: survey.teams.map((team) => ({
        id: team.team.id,
        mapId: team.id,
        teamName: team.team.name,
        responses: team.responses,
        surveyStats: team.surveyStats,
      })),
    };
    return surveys;
  });

  let summaryData = {
    totalTeamsCount: teamIds?.length,
    totalSurveysCount: allSurveys,
    activeSurveysCount: activeSurveys?.length,
    surveys: data,
  };

  return summaryData;
}

//get all ative and stopped survey summary

export async function getSurveysSummmaryByUserId(userId: string) {
  const teamIds = await getTeamIdsByUserId(userId);

  const allSurveys = await prisma.survey.findMany({
    where: {
      teams: {
        some: {
          teamId: {
            in: teamIds,
          },
        },
      },
    },
    select: {
      id: true,
      type: true,
      isPublished: true,
      title: true,
      active: true,
      createdAt: true,
      teams: {
        select: {
          id: true,
          _count: {
            select: {
              responses: true,
            },
          },
          surveyStats: {
            select: {
              started: true,
              completed: true,
              visited: true,
            },
          },
          team: {
            select: {
              name: true,
              id: true,
            },
          },
        },
      },
      WaFlow: {
        select: {
          dbFlowId: true,
          version: true,
        },
      },
    },
  });
  const data = allSurveys?.map((survey) => {
    let responseCount = 0;
    const teamMapIds: { teamMapId: string; teamName: string; teamId: string }[] = [];
    const teams: {
      id: string;
      mapId: string;
      teamName: string;
      surveyStats: (typeof survey.teams)[number]["surveyStats"];
    }[] = [];
    survey.teams.forEach((team) => {
      responseCount += team._count.responses;
      teamMapIds.push({
        teamMapId: team.id,
        teamName: team.team.name,
        teamId: team.team.id,
      });
      teams.push({
        id: team.team.id,
        mapId: team.id,
        teamName: team.team.name,
        surveyStats: team.surveyStats,
      });
    });
    const surveys = {
      ...survey,
      responseCount,
      teamMapIds,
      teams,
    };
    return surveys;
  });
  let summaryData = {
    totalTeamsCount: teamIds?.length,
    totalSurveysCount: allSurveys?.length,
    surveys: data,
    activeSurveysCount: allSurveys?.filter((s) => s.active)?.length,
  };

  return summaryData;
}

//------------get survey templates list --------
export async function getSurveyTemplates(surveyType: string) {
  const teamId = process.env.SURVEY_TEMPLATES_TEAM_ID;
  const surveyTeamMaps = await prisma.surveyTeamMap.findMany({
    where: {
      teamId: teamId,
    },
    include: {
      survey: {
        include: {
          webSurveyTheme: true,
        },
      },
    },
  });

  let surveys = surveyTeamMaps.map((surveyTeamMap) => {
    return surveyTeamMap.survey;
  });

  const surveysFiltered = surveys.filter((survey) => survey?.type === surveyType);

  const groupedSurveys = surveysFiltered.reduce<Record<string, typeof surveysFiltered>>(
    (groups, survey) => {
      const category = survey.title.split("__")[0];
      survey.title = survey.title.replace(`${category}__`, "");
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(survey);
      return groups;
    },
    {},
  );

  return groupedSurveys;
}

//------------DELETE SURVEY by id --------
export async function deleteSurveyById(id: string) {
  let orgId = await getSurveysOrgId(id);
  const survey = await prisma.survey.delete({
    where: {
      id,
    },
    include: {
      teams: true,
    },
  });

  if (survey && orgId) {
    let decrementCount =
      survey?.type === SurveyType.Web
        ? { surveysCount: { decrement: 1 } }
        : { waSurveysCount: { decrement: 1 } };
    await prisma.usageStats.update({
      where: { orgId: orgId },
      data: decrementCount,
    });
  }
  return survey;
}

//------------DELETE SURVEY from a team --------
export async function deleteSurveyFromTeam(id: string, input: DeleteTeamSurveyInput) {
  const surveyTeams = await prisma.surveyTeamMap.findMany({
    where: {
      surveyId: id,
    },
  });

  const surveyTeamMap = await prisma.surveyTeamMap.findFirst({
    where: {
      surveyId: id,
      teamId: input?.teamId,
    },
    include: {
      responses: true,
    },
  });

  if (!surveyTeamMap) {
    throw new Error("No survey found with the provided id and teamId");
  }

  if (surveyTeamMap?.responses && surveyTeamMap?.responses?.length > 0) {
    throw new Error("Cannot delete survey that has responses");
  }

  if (surveyTeams?.length > 1) {
    const deletedSurvey = await prisma.surveyTeamMap.delete({
      where: { id: surveyTeamMap?.id },
    });
    return deletedSurvey;
  } else {
    const deletedSurvey = await prisma.survey.delete({
      where: { id },
    });
    if (deletedSurvey && surveyTeams.length > 0) {
      const team = await getTeamById(surveyTeams[0].teamId);
      if (!team) {
        throw new Error(`Team not found: ${surveyTeams[0].teamId}`);
      }
      let decrementCount =
        deletedSurvey?.type === SurveyType.Web
          ? { surveysCount: { decrement: 1 } }
          : { waSurveysCount: { decrement: 1 } };
      await prisma.usageStats.update({
        where: { orgId: team.orgId },
        data: decrementCount,
      });
    }
    return deletedSurvey;
  }
}

//------------UPDATE SURVEY by id --------
export async function updateSurveyById(id: string, input: UpdateSurveyInput) {
  let action = "edit";

  const fetchedSurvey = await prisma.survey.findUnique({
    where: {
      id,
    },
  });

  if (!fetchedSurvey) {
    throw new Error(`Could not find survey with id ${id}`);
  }

  if ("isPublished" in input || input.surveyPublishAt) {
    action = "publish";
    if (input?.isPublished === true || input.surveyPublishAt) {
      //check for all language inputs
      const questions = fetchedSurvey.questions
        ? fetchedSurvey.questions.filter((q) => !((q as unknown as Question).type in PageType))
        : [];
      if (questions.length < 1) {
        let data = {
          status: "failed",
          data: {
            error: "No questions found.",
          },
        };
        return data;
      }

      let result = validateSurvey(fetchedSurvey);

      if (result?.length) {
        const groupedSurveys: Record<string, { id: string; title: unknown; errors: string[] }> = {};
        // group the survey errors
        result.forEach((survey) => {
          if (!groupedSurveys[survey.id]) {
            groupedSurveys[survey.id] = {
              id: survey.id,
              title: survey.title,
              errors: [],
            };
          }
          groupedSurveys[survey.id].errors.push(survey.error);
        });

        let combinedResult = Object.values(groupedSurveys);

        let data = {
          status: "failed",
          data: combinedResult,
        };
        return data;
      }
    } else {
      action = "unpublish";
    }
  }

  let { teams, ...dataInput } = input;

  const data: typeof dataInput & { questions?: Question[] } = cloneDeep(dataInput);

  if (fetchedSurvey.questions) {
    const questions = await getQuestionsArrUpdatedWithLanguageTypeQuestion(
      fetchedSurvey.questions,
      dataInput.languages,
    );
    data.questions = questions;
  }

  const survey = await prisma.survey.update({
    where: {
      id,
    },
    data: data,
  });

  const isOldSurvey = survey.createdAt < new Date(2024, 2, 1);

  if (teams?.length) {
    let teamIds = teams.map((team) => ({ teamId: team }));
    const surveyTeams = await prisma.surveyTeamMap.findMany({
      where: {
        surveyId: id,
      },
    });

    let existingTeams = surveyTeams.map((team) => team?.teamId);
    let newTeams = teamIds?.filter((team) => !existingTeams?.includes(team?.teamId));

    if (newTeams?.length) {
      const createRecordsInSurveyTeamMap = async () => {
        await prisma.surveyTeamMap.createMany({
          data: newTeams.map((team) => ({
            surveyId: id,
            ...team,
            shortUrlId: isOldSurvey ? null : getShortUrlId(),
          })),
        });
      };
      await shortIdUniqueConstraintErrHandler(createRecordsInSurveyTeamMap);
    }

    let deletedTeams = existingTeams?.filter(
      (team) => !teamIds?.map((team) => team?.teamId).includes(team),
    );

    if (deletedTeams?.length) {
      await Promise.all(
        deletedTeams?.map(async (teamId) => {
          const surveyTeamMap = await prisma.surveyTeamMap.findFirst({
            where: {
              surveyId: id,
              teamId: teamId,
            },
            include: {
              responses: true,
            },
          });

          if (!surveyTeamMap) {
            throw new Error("No survey found with the provided id and teamId");
          }

          if (surveyTeamMap?.responses && surveyTeamMap?.responses?.length > 0) {
            throw new Error("Remove team failed. Team survey has responses");
          }

          await prisma.surveyTeamMap.delete({
            where: { id: surveyTeamMap?.id },
          });
        }),
      );
    }
  }

  return {
    status: "success",
    action: action,
    data: survey,
  };
}

function validateSurvey(surveyData: { languages: string[]; questions: Question[] }): Array<{
  id: string;
  title: unknown;
  error: string;
}> {
  const languages = surveyData?.languages ?? [];
  const incompleteQuestions: Array<{ id: string; title: unknown; error: string }> = [];

  surveyData?.questions?.forEach((question) => {
    // Check if title contains all languages
    let titleLanguages = question?.title ? Object.keys(question.title) : [];
    let missingLangTitle = languages.filter(
      (lang) => !titleLanguages.includes(lang) || !question.title[lang].length,
    );
    if (missingLangTitle.length > 0) {
      incompleteQuestions.push({
        id: question?.id,
        title: question?.title,
        error: `Missing title for languages: ${missingLangTitle.join(", ")}`,
      });
    }

    if (
      [
        QuestionType.MCQ,
        QuestionType.MSQ,
        QuestionType.DDSS,
        QuestionType.DDMS,
        QuestionType.CustomNPS,
        QuestionType.MCQGrid,
      ].includes(question?.type)
    ) {
      if (question?.choices) {
        let choiceLanguages = Object.keys(question.choices);
        let missingLangChoices = languages.filter((lang) => !choiceLanguages.includes(lang));
        if (missingLangChoices.length > 0) {
          incompleteQuestions.push({
            id: question.id,
            title: question.title,
            error: `Missing choices for languages: ${missingLangChoices.join(", ")}`,
          });
        }

        // Check if all languages have the maximum number of choices
        let maxChoices = Math.max(
          ...Object.values(question.choices).map((choiceArr) => choiceArr?.length),
        );
        let unequalChoices = Object.values(question.choices).some(
          (choiceArr) => choiceArr?.length < maxChoices,
        );
        if (unequalChoices) {
          incompleteQuestions.push({
            id: question.id,
            title: question.title,
            error: `All languages must have ${maxChoices} choices.`,
          });
        }

        // Check for minimum 2 choices
        let insufficientChoices = Object.values(question.choices).some(
          (choiceArr) => choiceArr.length < 2,
        );
        if (insufficientChoices) {
          incompleteQuestions.push({
            id: question.id,
            title: question.title,
            error: "Minimum 2 choices required for all languages.",
          });
        }
      } else {
        // If choices are not present but the question type requires choices
        incompleteQuestions.push({
          id: question.id,
          title: question.title,
          error: "Choices are required but missing for some languages.",
        });
      }
    }
    if ([QuestionType.MultiTextInput].includes(question?.type)) {
      if (!question?.features) {
        incompleteQuestions.push({
          id: question.id,
          title: question.title,
          error: `fields are missing`,
        });
      } else {
        let fieldLanguages = Object.entries(question?.features).map(
          ([lang, value]: [string, any]) => {
            if (value?.fields?.length) return lang;
          },
        );
        let fieldMissingLangs = languages.filter((lang) => !fieldLanguages.includes(lang));
        if (fieldMissingLangs.length > 0) {
          incompleteQuestions.push({
            id: question.id,
            title: question.title,
            error: `fields are required, but missing for languages: ${fieldMissingLangs.join(
              ", ",
            )}`,
          });
        }
      }
    }
  });

  return incompleteQuestions;
}

export async function getGoogleUrlBySurveyTeamMapId(surveyTeamMapId: string) {
  const surveyTeamMap = await prisma.surveyTeamMap.findUnique({
    where: {
      id: surveyTeamMapId,
    },
    select: {
      team: {
        select: {
          googleLink: true,
          reviewPageLinks: true,
        },
      },
    },
  });

  if (!surveyTeamMap) {
    throw new Error(`Could not find survey team map with id ${surveyTeamMapId}`);
  }

  const { googleLink, reviewPageLinks } = surveyTeamMap.team;
  // reviewPageLinks is a dynamic JSON blob keyed by review-platform name (e.g. "Google",
  // "Facebook") — there's no fixed schema for it (see team.schema.ts's `z.any()`).
  return googleLink?.length
    ? googleLink
    : (reviewPageLinks as Record<string, string> | null)?.["Google"];
}

export async function updateGoogleLink(id: string, data: UpdateGoogleLinkInput) {
  const survey = await prisma.surveyTeamMap.findUnique({
    where: {
      id,
    },
    select: {
      teamId: true,
    },
  });

  if (survey) {
    const team = await prisma.team.update({
      where: {
        id: survey.teamId,
      },
      data: {
        googleLink: data.googleLink,
      },
    });

    return team;
  } else {
    return { error: "Survey not found" };
  }
}

export async function updateSurveyPassword(id: string, data: UpdateSurveyPassword) {
  let isProtected = true;
  let password = data.password;
  try {
    if (data.password === "_remove_pwd") {
      isProtected = false;
      password = "";
    } else {
      isProtected = true;
      // password = CryptoJS.AES.encrypt(password, secretPassphrase).toString();
    }
    const survey = await prisma.survey.update({
      where: {
        id,
      },
      data: {
        password,
        isProtected,
      },
    });
    return survey;
  } catch (error) {
    console.error("Failed to update survey password:", error);
    throw error;
  }
}

export async function verifySurveyPassword(id: string, data: UpdateSurveyPassword) {
  let enteredPassword = data.password;
  try {
    const survey = await prisma.survey.findUnique({
      where: { id },
    });
    if (!survey) {
      throw new Error(`Survey not found`);
    }

    // const decryptedPassword = CryptoJS.AES.decrypt(
    //   survey.password,
    //   secretPassphrase,
    // ).toString(CryptoJS.enc.Utf8);

    if (survey.isProtected && survey.password === enteredPassword) {
      return "Access granted";
    } else {
      throw new Error(`Password Error`);
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

export async function updateVisitedSurvey(id: string) {
  const surveyStats = await prisma.surveyStats.upsert({
    where: { surveyTeamMapId: id },
    update: { visited: { increment: 1 } },
    create: { surveyTeamMapId: id, visited: 1 },
  });
  return surveyStats;
}

export async function updateStartedSurvey(id: string) {
  const surveyStats = await prisma.surveyStats.upsert({
    where: { surveyTeamMapId: id },
    update: { started: { increment: 1 } },
    create: { surveyTeamMapId: id, started: 1, visited: 1 },
  });
  return surveyStats;
}

export async function updateCompletedSurvey(id: string) {
  const surveyStats = await prisma.surveyStats.upsert({
    where: { surveyTeamMapId: id },
    update: { completed: { increment: 1 } },
    create: { surveyTeamMapId: id, completed: 1, visited: 1, started: 1 },
  });
  return surveyStats;
}

export async function updateReviewLinkVisitedOnSurvey(id: string) {
  const surveyStats = await prisma.surveyStats.upsert({
    where: { surveyTeamMapId: id },
    update: { reviewLinkVisited: { increment: 1 } },
    create: {
      surveyTeamMapId: id,
      visited: 1,
      started: 1,
      reviewLinkVisited: 1,
    },
  });
  return surveyStats;
}

export async function saveSheetIdToSurvey(sheetId: string, surveyId: string) {
  let res = await prisma.survey.update({
    where: {
      id: surveyId,
    },
    data: {
      spreadSheetId: sheetId,
    },
  });
  return res;
}

/**
 * Gets all used languages from surveys of a team
 * */
export async function getSurveyLanguagesFromTeamId(teamId: string) {
  const surveyTeamMaps = await prisma.surveyTeamMap.findMany({
    where: {
      teamId,
    },
    select: {
      survey: {
        select: {
          languages: true,
        },
      },
    },
  });

  const languages = surveyTeamMaps?.flatMap((surveyTeamMap) => surveyTeamMap.survey.languages);
  const uniqueLanguages = [...new Set(languages)];
  return uniqueLanguages;
}

export async function createSurveyVariable(surveyId: string, variable: surveyVariableInput) {
  const res = await prisma.surveyVariables.create({
    data: {
      name: variable?.name,
      type: variable?.type,
      value: variable?.value,
      surveyId,
    },
  });
  return res;
}
export async function getSurveyVariables(surveyId: string) {
  const res = await prisma.surveyVariables.findMany({
    where: {
      surveyId,
    },
  });
  return res;
}

/**
 * Rebuilds a survey's DEFAULT variables so their `Q<n>_…` names match the
 * questions' current order. Call this after any change to the question list —
 * an insert, a delete, or a reorder — since every name after the edit moves.
 *
 * The delete and the insert are one transaction, and rebuilds of the same
 * survey are serialised by an advisory lock held to the end of it. Without the
 * lock, two overlapping requests both delete the old rows and then race to
 * insert the same names, and the loser hits the (name, surveyId) unique
 * constraint — which is what a double-submitted reorder used to do.
 */
export async function updateSurveyVariables(surveyId: string, questions: Question[]) {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    select: { type: true },
  });
  // Only web surveys carry variables; for the rest this just clears any left
  // behind by a survey that changed type.
  const rows =
    survey?.type === SurveyType.Web
      ? questions.flatMap((question, index) =>
          defaultVariablesForQuestion(question, index).map((variable) => ({
            ...variable,
            surveyId,
          })),
        )
      : [];

  await prisma.$transaction([
    // hashtext is stable across sessions, so every rebuild of this survey takes
    // the same lock; rebuilds of other surveys are unaffected.
    prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${surveyId})::bigint)`,
    prisma.surveyVariables.deleteMany({
      where: {
        type: SurveyVariableType.DEFAULT as string,
        surveyId,
      },
    }),
    prisma.surveyVariables.createMany({ data: rows }),
  ]);
}

export async function updateSurveyVariable(variableId: string, data: surveyVariableUpdateInput) {
  return await prisma.surveyVariables.update({
    where: {
      id: variableId,
    },
    data,
  });
}

export async function deleteSurveyVariable(variableId: string) {
  return await prisma.surveyVariables.delete({
    where: {
      id: variableId,
    },
  });
}

export async function publishSurveyCronAction() {
  const currentTime = new Date();
  const fiveMinutesLater = new Date(currentTime.getTime() + 5 * 60000); //TO HANDLE DELAYS- Buffer Time

  const surveysToPublish = await prisma.survey.findMany({
    where: {
      NOT: {
        surveyPublishAt: null,
      },
      AND: [
        { isPublished: false },
        {
          surveyPublishAt: {
            // gte: fiveMinutesEarlier,
            lte: fiveMinutesLater,
          },
        },
      ],
    },
  });

  for (const survey of surveysToPublish) {
    await prisma.survey.update({
      where: { id: survey.id },
      data: { isPublished: true },
    });
  }

  console.log(`Published ${surveysToPublish.length} surveys. At ${currentTime}`);
}

export async function endSurveyCronAction() {
  const currentTime = new Date();
  const fiveMinutesLater = new Date(currentTime.getTime() + 5 * 60000); //TO HANDLE DELAYS - Buffer Time

  const surveysToUnpublish = await prisma.survey.findMany({
    where: {
      NOT: {
        surveyEndAt: null,
      },
      AND: [
        { isPublished: true },
        {
          surveyEndAt: {
            lte: fiveMinutesLater,
          },
        },
      ],
    },
  });

  for (const survey of surveysToUnpublish) {
    await prisma.survey.update({
      where: { id: survey.id },
      data: { isPublished: false, surveyPublishAt: null },
    });
  }

  console.log(`Unpublished ${surveysToUnpublish.length} surveys. At ${currentTime}`);
}

export async function getSurveyResponseCountForGraph(
  orgId: string,
  userTimeZone: string,
  timePeriod: string,
  surveyId = "",
  teamMapIds: string[] = [],
) {
  let res: Array<{ date: string | number; responses: number }> | null = null;
  if (timePeriod === "hourly") {
    const rawRows = await prisma.$queryRaw<Array<{ date: string; responses: number }>>`SELECT
            TO_CHAR(sr."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${userTimeZone}, 'HH12 AM') AS date,
            COUNT(*)::INTEGER AS responses
          FROM "SurveyResponse" sr
          LEFT JOIN "SurveyTeamMap" st ON sr."surveyTeamMapId" = st.id
          LEFT JOIN "Survey" s ON st."surveyId" = s.id
          WHERE s."orgId" = ${orgId}::uuid
          AND sr."createdAt"::DATE = CURRENT_DATE ${surveyId.length ? Prisma.sql`AND st."surveyId" = ${surveyId}::uuid` : Prisma.empty}
          ${teamMapIds.length ? Prisma.sql`AND st.id = ANY(${teamMapIds}::uuid[])` : Prisma.empty}
          GROUP BY date
          ORDER BY date;
          ;`;

    const resMap = new Map(rawRows.map((r) => [r.date, r]));
    res = [];
    for (var i = 0; i < 24; i++) {
      let date = dayjs().hour(i).format("hh A");
      res.push(resMap.get(date) ?? { date, responses: 0 });
    }
  } else if (timePeriod === "daily") {
    const rawRows = await prisma.$queryRaw<Array<{ date: string; responses: number }>>`
        SELECT TO_CHAR(sr."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${userTimeZone}, 'Mon DD') AS date, COUNT(*)::INTEGER AS responses
        FROM "SurveyResponse" sr
        LEFT JOIN "SurveyTeamMap" st ON sr."surveyTeamMapId" = st.id
        LEFT JOIN "Survey" s ON st."surveyId" = s.id
        WHERE s."orgId"=${orgId}::uuid ${surveyId.length ? Prisma.sql`AND st."surveyId" = ${surveyId}::uuid` : Prisma.empty}
        ${teamMapIds.length ? Prisma.sql`AND st.id = ANY(${teamMapIds}::uuid[])` : Prisma.empty}
        AND sr."createdAt" >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY date ORDER BY date;
    `;
    const resMap = new Map(rawRows.map((r) => [r.date, r]));
    res = [];
    for (var i = 30; i > 0; i--) {
      let date = dayjs()
        .subtract(i - 1, "day")
        .format("MMM DD");
      res.push(resMap.get(date) ?? { date, responses: 0 });
    }
  } else if (timePeriod === "weekly") {
    const rawRows = await prisma.$queryRaw<
      Array<{ date: number; responses: number }>
    >`WITH current_week AS (
            SELECT DATE_TRUNC('week', NOW() AT TIME ZONE 'UTC' AT TIME ZONE ${userTimeZone}) AS this_week,
            CURRENT_DATE - INTERVAL '1 year' as year_back
        )
        SELECT
        (EXTRACT(EPOCH FROM (cw.this_week - DATE_TRUNC('week', sr."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${userTimeZone}))) / 604800)::INTEGER as date,
        COUNT(*)::INTEGER AS responses
        FROM "SurveyResponse" sr
        LEFT JOIN "SurveyTeamMap" st ON sr."surveyTeamMapId" = st.id
        LEFT JOIN "Survey" s ON st."surveyId" = s.id
        JOIN current_week cw ON TRUE
        WHERE s."orgId"=${orgId}::uuid ${surveyId.length ? Prisma.sql`AND st."surveyId" = ${surveyId}::uuid` : Prisma.empty}
        ${teamMapIds.length ? Prisma.sql`AND st.id = ANY(${teamMapIds}::uuid[])` : Prisma.empty}
        AND sr."createdAt"::DATE >= cw.year_back
      GROUP BY date ORDER BY date;`;

    const resMap = new Map(rawRows.map((r) => [r.date, r]));
    res = [];
    for (var i = 52; i >= 0; i--) {
      res.push(resMap.get(i) ?? { date: i, responses: 0 });
    }
  }

  return res;
}

type CategorizeResult = "promoter" | "passive" | "detractor" | null;

const OPINION_SCALE_PROMOTER_THRESHOLD = 9;
const OPINION_SCALE_PASSIVE_THRESHOLD = 7;
const HAPPINESS_INDEX_MULTIPLIER = 10;

/**
 * `r` is one stored answer. v1 keys the value by QuestionType; v2 stores it bare — the
 * `version` flag says which, so the reads below narrow per branch.
 */
function categorize(
  r: { response: unknown },
  q: Question | Question2,
  version: boolean,
): CategorizeResult {
  // v1 answers are keyed by QuestionType; v2 store the value bare.
  const keyed = (type: QuestionType): unknown => (r.response as Record<string, unknown>)[type];
  const questionType =
    "metaType" in q ? (QuestionType as Record<string, QuestionType>)[q.metaType ?? ""] : q.type;
  if (questionType === QuestionType.Opinion) {
    const val = version ? Number(keyed(QuestionType.Opinion)) : Number(r.response);
    if (Number(val) >= OPINION_SCALE_PROMOTER_THRESHOLD) return "promoter";
    if (Number(val) >= OPINION_SCALE_PASSIVE_THRESHOLD) return "passive";
    return "detractor";
  }

  if (questionType === QuestionType.Rating) {
    const val = version ? Number(keyed(QuestionType.Rating)) : Number(r.response);
    if (val === 5) return "promoter";
    if (val === 4) return "passive";
    return "detractor";
  }

  if (questionType === QuestionType.Smiley) {
    if (version) {
      const val = keyed(QuestionType.Smiley);
      if (["Very Happy", "Happy"].includes(String(val))) return "promoter";
      else if (["Neutral"].includes(String(val))) return "passive";
      return "detractor";
    } else {
      const val = Number(r.response);
      if ([5, 4].includes(val)) return "promoter";
      else if ([3].includes(val)) return "passive";
      else return "detractor";
    }
  }

  if (questionType === QuestionType.LD) {
    if (version) {
      const val = keyed(QuestionType.LD);
      return val === "Like" ? "promoter" : "detractor";
    } else {
      const val = Number(r.response);
      return val === 1 ? "promoter" : "detractor";
    }
  }

  if (questionType === QuestionType.YN) {
    if (version) {
      const val = keyed(QuestionType.YN);
      return val === "Yes" ? "promoter" : "detractor";
    } else {
      const val = Number(r.response);
      return val === 1 ? "promoter" : "detractor";
    }
  }

  // No matching NPS-eligible question type — nothing to categorize.
  return null;
}

/** One row of the NPS graph query: a response's timestamp and its stored answers. */
interface NpsResponseRow {
  createdAt: Date;
  responses: QuestionResponse[];
}

export async function getNPSResponsesForGraph(
  orgId: string,
  userTimeZone: string,
  timePeriod: "hourly" | "daily" | "weekly" | string,
  surveyId = "",
  teamMapIds: string[] = [],
  teamIds: string[],
) {
  const surveyInfo = await prisma.surveyTeamMap.findFirst({
    where: { surveyId },
    select: {
      survey: {
        select: {
          type: true,
          questions: true,
          WaFlow: {
            select: {
              version: true,
              json: true,
            },
          },
        },
      },
    },
  });
  if (!surveyInfo) return { e: "no response" };

  const isFlow = surveyInfo.survey.type === SurveyType.WaFlow;
  const version = !isFlow || surveyInfo.survey.WaFlow?.version === 1;

  let questions: Question[] | Question2[];
  if (version) {
    questions = surveyInfo.survey.questions.filter((q) => barGraphQuestions.includes(q.type));
  } else {
    const waFlow = surveyInfo.survey.WaFlow;
    if (!waFlow) {
      throw new Error(`WaFlow data missing for waFlow survey ${surveyId}`);
    }
    questions = waFlow.json.screens.flatMap((screen) =>
      screen.layout.children.filter(
        (child) =>
          child.metaType !== undefined && barGraphQuestions2.includes(child.metaType) && child.name,
      ),
    ) as unknown as Question2[];
  }
  let rawResponses = await prisma.$queryRaw<NpsResponseRow[]>`
    SELECT 
      sr."createdAt",
      sr."responses"
    FROM "SurveyResponse" sr
    LEFT JOIN "SurveyTeamMap" st ON sr."surveyTeamMapId" = st.id
    LEFT JOIN "Survey" s ON st."surveyId" = s.id
    WHERE s."orgId" = ${orgId}::uuid
      ${surveyId.length ? Prisma.sql`AND st."surveyId" = ${surveyId}::uuid` : Prisma.empty}
      ${teamMapIds.length ? Prisma.sql`AND st.id = ANY(${teamMapIds}::uuid[])` : Prisma.sql`AND st."teamId"= ANY(${teamIds}::uuid[])`}
      AND sr."createdAt" >= CURRENT_DATE - INTERVAL '1 year'
  `;
  const resultMap = new Map<
    string,
    {
      date: string;
      promoters: number;
      passives: number;
      detractors: number;
      total: number;
      totalScore: number;
      totalNPSResponses: number;
    }
  >();

  // Group data by time bucket
  for (const res of rawResponses) {
    const bucket =
      timePeriod === "hourly"
        ? dayjs(res.createdAt).tz(userTimeZone).format("hh A")
        : timePeriod === "daily"
          ? dayjs(res.createdAt).tz(userTimeZone).format("MMM DD")
          : `${dayjs().diff(dayjs(res.createdAt), "week")}`; // weeks ago

    if (!resultMap.has(bucket)) {
      resultMap.set(bucket, {
        date: bucket,
        promoters: 0,
        passives: 0,
        detractors: 0,
        total: 0,
        totalScore: 0,
        totalNPSResponses: 0,
      });
    }

    for (const r of res.responses) {
      const matchedQuestion = questions.find((q) => q.id === r.questionId);

      if (!matchedQuestion) continue;

      const bucketData = resultMap.get(bucket)!;
      const category = categorize(r, matchedQuestion, version);

      if (category === "promoter") bucketData.promoters++;
      else if (category === "passive") bucketData.passives++;
      else if (category === "detractor") bucketData.detractors++;

      const value = extractNumericValue(r.response);
      if (typeof value === "number") {
        bucketData.totalScore += value;
        bucketData.totalNPSResponses++;
      }

      bucketData.total++;
    }
  }

  const finalResult: {
    date: string;
    promoters: number;
    passives: number;
    detractors: number;
    total: number;
    npsScore: number;
    happinessIndex: number;
    avgNPSRating: number;
  }[] = [];

  const fill = (date: string) => {
    const d = resultMap.get(date);
    if (!d) {
      return {
        date,
        promoters: 0,
        passives: 0,
        detractors: 0,
        total: 0,
        npsScore: 0,
        happinessIndex: 0,
        avgNPSRating: 0,
      };
    }

    const { promoters, passives, detractors, total, totalScore, totalNPSResponses } = d;
    const npsScore = total > 0 ? ((promoters - detractors) / total) * 100 : 0;
    const happinessIndex = total > 0 ? (promoters * HAPPINESS_INDEX_MULTIPLIER) / total : 0;
    const avgNPSRating = totalNPSResponses > 0 ? totalScore / totalNPSResponses : 0;

    return {
      date: d.date,
      promoters,
      passives,
      detractors,
      total,
      npsScore,
      happinessIndex,
      avgNPSRating,
    };
  };

  if (timePeriod === "hourly") {
    for (let i = 0; i < 24; i++) {
      const date = dayjs().hour(i).format("hh A");
      finalResult.push(fill(date));
    }
  } else if (timePeriod === "daily") {
    for (let i = 30; i > 0; i--) {
      const date = dayjs()
        .subtract(i - 1, "day")
        .format("MMM DD");
      finalResult.push(fill(date));
    }
  } else if (timePeriod === "weekly") {
    for (let i = 52; i >= 0; i--) {
      const date = `${i}`;
      finalResult.push(fill(date));
    }
  }

  return finalResult;
}

function extractNumericValue(response: unknown): number | null {
  if (typeof response === "number") return response;
  if (typeof response === "string" && !isNaN(Number(response))) return Number(response);
  return null;
}
