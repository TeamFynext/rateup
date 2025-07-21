import prisma, { excludeFields } from "../../utils/prisma";
import {
  CreateSurveyInput,
  DeleteTeamSurveyInput,
  surveyVariableInput,
  UpdateGoogleLinkInput,
  UpdateSurveyInput,
  UpdateSurveyPassword,
} from "./survey.schema";
import { getTeamById, getTeamIdsByUserId } from "../team/team.service";
import {
  PageType,
  QuestionType,
  SubscriptionFeaturePathName,
  SurveyType,
  SurveyVariableType,
} from "../../types/enums";
import {
  getShortUrlId,
  shortIdUniqueConstraintErrHandler,
} from "../../utils/commonUtils";
import {
  createSurveyDefaultVariableForQuestion,
  getSurveysOrgId,
  isShortId,
} from "./survey.utils";
import { offerArrayWithRange } from "../../utils/survey/offer";
import { cloneDeep } from "lodash";
import util from "util";
import {
  getInitialSurveyQuestions,
  getPageQuestions,
  getQuestionsArrUpdatedWithLanguageTypeQuestion,
} from "../question/question.utils";
import { defaultWebSurveyPagesTheme } from "../surveyTheme/defaultTheme";
import { hasFeature } from "../subscription/subscription.service";
import { updateQuestionsOnSurvey } from "../question/question.service";
import { createStats } from "../stats/stats.service";
import dayjs from "dayjs";
import { Prisma } from "../../../generated/prisma/client";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

// TODO: fix return type
// should throw error on error instead of returning error message as string
export async function createSurvey(
  data: CreateSurveyInput & { orgId: string },
  req,
) {
  const { userId: createdBy, email: notificationEmail, orgId } = req?.user;

  const { templateId, selectedTheme, ...input } = data;
  delete input.teamIds;

  if (templateId) {
    return cloneSurvey(templateId, createdBy, data.teamIds, true);
  } else {
    const createRecord = async () => {
      const teamIds = data?.teamIds?.map((teamId) => {
        return {
          teamId,
          shortUrlId: getShortUrlId(),
        };
      });

      const { id: defaultThemeId } = await prisma.webSurveyTheme.findFirst({
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
            create: teamIds,
          },
          webSurveyThemeId: selectedTheme || defaultThemeId,
          questions: getInitialSurveyQuestions(input.languages),
          webSurveyPagesTheme: defaultWebSurveyPagesTheme,
        },
      });
      return survey;
    };

    const survey = await shortIdUniqueConstraintErrHandler(createRecord);
    if (survey) {
      if (data.teamIds.length > 0) {
        let team = await getTeamById(data.teamIds[0]);
        let incrementCount =
          survey?.type === SurveyType.Web
            ? { surveysCount: { increment: 1 } }
            : { waSurveysCount: { increment: 1 } };
        await prisma.usageStats.update({
          where: { orgId: team.orgId },
          data: incrementCount,
        });
      }

      return { ...survey, teamIds: input?.teamIds };
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
    const { id, ...surveyWithoutId } = survey;

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

    const clonedSurvey = {
      ...surveyWithoutId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: null,
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
    const newClonedSurvey =
      await shortIdUniqueConstraintErrHandler(createClonedSurvey);

    if (newClonedSurvey && teamIds.length > 0) {
      let team = await getTeamById(teamIds[0]);
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
  if (
    !(await hasFeature(
      survey.orgId ?? survey.webSurveyTheme.orgId,
      SubscriptionFeaturePathName.GoogleReview,
    ))
  ) {
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
  if (
    !(await hasFeature(
      surveyTeamMap.survey.orgId,
      SubscriptionFeaturePathName.GoogleReview,
    ))
  ) {
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
  //-------------form array if survey ids ---------
  let surveyIds = [];
  for (let i = 0; i < Landingpages?.surveys?.length; i++) {
    surveyIds.push(Landingpages.surveys[i]);
  }

  //----------get surveys from surveyids------------
  const surveyResponse = await prisma.survey.findMany({
    where: {
      id: {
        in: surveyIds,
      },
    },
  });

  if (!Landingpages || Landingpages.surveys.length == 0) {
    throw new Error(`Could not find survey with id ${landingid}`);
  }
  return surveyResponse;
}

//------------get ALL Surveys list of a logged user (without qns)--------

export async function getSurveysByUserId(
  userId: string,
  includeQuestions: boolean = false,
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
      ...{ surveyTeamMapId: surveyTeamMap.id },
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

export async function getSurveyStats(surveyId) {
  const surveyStats = await prisma.surveyStats.findMany({
    where: {
      surveyTeamMap: {
        surveyId,
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
    let teamMapIds = [];
    let teams = [];
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

  const surveysFiltered = surveys.filter(
    (survey) => survey?.type === surveyType,
  );

  const groupedSurveys = surveysFiltered.reduce((groups, survey) => {
    const category = survey.title.split("__")[0];
    survey.title = survey.title.replace(`${category}__`, "");
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(survey);
    return groups;
  }, {});

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
export async function deleteSurveyFromTeam(
  id: string,
  input: DeleteTeamSurveyInput,
) {
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
      let team = await getTeamById(surveyTeams[0].teamId);
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

  if ("isPublished" in input || input.surveyPublishAt) {
    action = "publish";
    if (input?.isPublished === true || input.surveyPublishAt) {
      //check for all language inputs
      const questions = fetchedSurvey.questions
        ? fetchedSurvey.questions.filter(
            (q) => !((q as unknown as Question).type in PageType),
          )
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
        let groupedSurveys = {};
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

  const data = cloneDeep(dataInput);

  if (fetchedSurvey?.questions) {
    const questions = await getQuestionsArrUpdatedWithLanguageTypeQuestion(
      fetchedSurvey.questions,
      dataInput.languages,
    );
    data["questions"] = questions;
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
    let newTeams = teamIds?.filter(
      (team) => !existingTeams?.includes(team?.teamId),
    );

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
      const newSurveyTeams = await shortIdUniqueConstraintErrHandler(
        createRecordsInSurveyTeamMap,
      );
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

          if (
            surveyTeamMap?.responses &&
            surveyTeamMap?.responses?.length > 0
          ) {
            throw new Error("Remove team failed. Team survey has responses");
          }

          const deletedSurvey = await prisma.surveyTeamMap.delete({
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

function validateSurvey(surveyData) {
  let languages = surveyData?.languages ?? [];
  let incompleteQuestions = [];

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
        let missingLangChoices = languages.filter(
          (lang) => !choiceLanguages.includes(lang),
        );
        if (missingLangChoices.length > 0) {
          incompleteQuestions.push({
            id: question.id,
            title: question.title,
            error: `Missing choices for languages: ${missingLangChoices.join(
              ", ",
            )}`,
          });
        }

        // Check if all languages have the maximum number of choices
        let maxChoices = Math.max(
          ...Object.values(question.choices).map(
            (choiceArr: any[]) => choiceArr?.length,
          ),
        );
        let unequalChoices = Object.values(question.choices).some(
          (choiceArr: any[]) => choiceArr?.length < maxChoices,
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
          (choiceArr: any[]) => choiceArr.length < 2,
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
        let fieldMissingLangs = languages.filter(
          (lang) => !fieldLanguages.includes(lang),
        );
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
  const {
    team: { googleLink, reviewPageLinks },
  } = await prisma.surveyTeamMap.findUnique({
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
  return googleLink?.length ? googleLink : reviewPageLinks["Google"];
}

export async function updateGoogleLink(
  id: string,
  data: UpdateGoogleLinkInput,
) {
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

export async function updateSurveyPassword(
  id: string,
  data: UpdateSurveyPassword,
) {
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

export async function verifySurveyPassword(
  id: string,
  data: UpdateSurveyPassword,
) {
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
    throw new Error(error?.message);
  }
}

export async function updateVisitedSurvey(id: string) {
  let surveyStats;
  try {
    surveyStats = await prisma.surveyStats.upsert({
      where: { surveyTeamMapId: id },
      update: { visited: { increment: 1 } },
      create: { surveyTeamMapId: id, visited: 1 },
    });
  } catch (error: any) {
    throw error;
  }
  return surveyStats;
}

export async function updateStartedSurvey(id: string) {
  let surveyStats;
  try {
    surveyStats = await prisma.surveyStats.upsert({
      where: { surveyTeamMapId: id },
      update: { started: { increment: 1 } },
      create: { surveyTeamMapId: id, started: 1, visited: 1 },
    });
  } catch (error: any) {
    throw error;
  }
  return surveyStats;
}

export async function updateCompletedSurvey(id: string) {
  let surveyStats;
  try {
    surveyStats = await prisma.surveyStats.upsert({
      where: { surveyTeamMapId: id },
      update: { completed: { increment: 1 } },
      create: { surveyTeamMapId: id, completed: 1, visited: 1, started: 1 },
    });
  } catch (error: any) {
    throw error;
  }
  return surveyStats;
}

export async function saveSheetIdToSurvey(sheetId: string, surveyId) {
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

  const languages = surveyTeamMaps?.flatMap(
    (surveyTeamMap) => surveyTeamMap.survey.languages,
  );
  const uniqueLanguages = [...new Set(languages)];
  return uniqueLanguages;
}

export async function createSurveyVariable(
  surveyId: string,
  variable: surveyVariableInput,
) {
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

//update on question order change
export async function updateSurveyVariables(surveyId, questions) {
  await prisma.surveyVariables.deleteMany({
    where: {
      type: SurveyVariableType.DEFAULT as string,
      surveyId,
    },
  });
  for (const [index, question] of questions.entries()) {
    await createSurveyDefaultVariableForQuestion(surveyId, question, index);
  }
}

export async function updateSurveyVariable(variableId, data) {
  return await prisma.surveyVariables.update({
    where: {
      id: variableId,
    },
    data,
  });
}

export async function deleteSurveyVariable(variableId) {
  return await prisma.surveyVariables.delete({
    where: {
      id: variableId,
    },
  });
}

export async function publishSurveyCronAction() {
  const currentTime = new Date();
  const fiveMinutesLater = new Date(currentTime.getTime() + 5 * 60000); //TO HANDLE DELAYS- Buffer Time
  const fiveMinutesEarlier = new Date(currentTime.getTime() - 5 * 60000);

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

  console.log(
    `Published ${surveysToPublish.length} surveys. At ${currentTime}`,
  );
}

export async function endSurveyCronAction() {
  const currentTime = new Date();
  const fiveMinutesLater = new Date(currentTime.getTime() + 5 * 60000); //TO HANDLE DELAYS - Buffer Time
  const fiveMinutesEarlier = new Date(currentTime.getTime() - 5 * 60000);

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

  console.log(
    `Unpublished ${surveysToUnpublish.length} surveys. At ${currentTime}`,
  );
}

export async function getSurveyResponseCountForGraph(
  orgId: string,
  userTimeZone,
  timePeriod,
  surveyId = "",
  teamMapIds = [],
) {
  let res = null;
  if (timePeriod === "hourly") {
    res = await prisma.$queryRaw`SELECT 
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

    const resMap = new Map(res.map((r) => [r.date, r]));
    res = [];
    for (var i = 0; i < 24; i++) {
      let date = dayjs().hour(i).format("hh A");
      res.push(resMap.get(date) ?? { date, responses: 0 });
    }
  } else if (timePeriod === "daily") {
    res = await prisma.$queryRaw`
        SELECT TO_CHAR(sr."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${userTimeZone}, 'Mon DD') AS date, COUNT(*)::INTEGER AS responses
        FROM "SurveyResponse" sr
        LEFT JOIN "SurveyTeamMap" st ON sr."surveyTeamMapId" = st.id
        LEFT JOIN "Survey" s ON st."surveyId" = s.id
        WHERE s."orgId"=${orgId}::uuid ${surveyId.length ? Prisma.sql`AND st."surveyId" = ${surveyId}::uuid` : Prisma.empty}
        ${teamMapIds.length ? Prisma.sql`AND st.id = ANY(${teamMapIds}::uuid[])` : Prisma.empty}
        AND sr."createdAt" >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY date ORDER BY date;
    `;
    const resMap = new Map(res.map((r) => [r.date, r]));
    res = [];
    for (var i = 30; i > 0; i--) {
      let date = dayjs()
        .subtract(i - 1, "day")
        .format("MMM DD");
      res.push(resMap.get(date) ?? { date, responses: 0 });
    }
  } else if (timePeriod === "weekly") {
    res = await prisma.$queryRaw`WITH current_week AS (
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

    const resMap = new Map(res.map((r) => [r.date, r]));
    res = [];
    for (var i = 52; i >= 0; i--) {
      res.push(resMap.get(i) ?? { date: i, responses: 0 });
    }
  }

  return res;
}

const NPS_TYPES = new Set([
  "Rating",
  "Smiley",
  "Like or Dislike",
  "Yes or No",
  "Opinion Scale",
]);

interface CategorizeResponse {
  response: Record<string, string | number>;
}

type CategorizeResult = "promoter" | "passive" | "detractor" | null;

const OPINION_SCALE_PROMOTER_THRESHOLD = 9;
const OPINION_SCALE_PASSIVE_THRESHOLD = 7;
const HAPPINESS_INDEX_MULTIPLIER = 10;

function categorize(response: CategorizeResponse): CategorizeResult {
  const [type, data] = Object.entries(response.response)[0];

  switch (type) {
    case "Rating":
      if (data === 5) return "promoter";
      if (data === 4) return "passive";
      return "detractor";

    case "Smiley":
      if (["Very Happy", "Happy"].includes(data.toString())) return "promoter";
      if (data === "Neutral") return "passive";
      return "detractor";

    case "Like or Dislike":
      return data === "Like" ? "promoter" : "detractor";

    case "Yes or No":
      return data === "Yes" ? "promoter" : "detractor";

    case "Opinion Scale":
      if (Number(data) >= OPINION_SCALE_PROMOTER_THRESHOLD) return "promoter";
      if (Number(data) >= OPINION_SCALE_PASSIVE_THRESHOLD) return "passive";
      return "detractor";

    default:
      return null;
  }
}

export async function getNPSResponsesForGraph(
  orgId: string,
  userTimeZone: string,
  timePeriod: "hourly" | "daily" | "weekly" | string,
  surveyId = "",
  teamMapIds: string[] = [],
) {
  let rawResponses = await prisma.$queryRaw<any>`
    SELECT 
      sr."createdAt",
      sr."responses"
    FROM "SurveyResponse" sr
    LEFT JOIN "SurveyTeamMap" st ON sr."surveyTeamMapId" = st.id
    LEFT JOIN "Survey" s ON st."surveyId" = s.id
    WHERE s."orgId" = ${orgId}::uuid
      ${surveyId.length ? Prisma.sql`AND st."surveyId" = ${surveyId}::uuid` : Prisma.empty}
      ${teamMapIds.length ? Prisma.sql`AND st.id = ANY(${teamMapIds}::uuid[])` : Prisma.empty}
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

    const filtered = res.responses.filter((r) => NPS_TYPES.has(r.type));

    for (const r of filtered) {
      const cat = categorize(r);
      const bucketData = resultMap.get(bucket)!;

      if (cat === "promoter") bucketData.promoters++;
      else if (cat === "passive") bucketData.passives++;
      else if (cat === "detractor") bucketData.detractors++;

      if (typeof r.value === "number") {
        bucketData.totalScore += r.value;
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

    const {
      promoters,
      passives,
      detractors,
      total,
      totalScore,
      totalNPSResponses,
    } = d;
    const npsScore = total > 0 ? ((promoters - detractors) / total) * 100 : 0;
    const happinessIndex =
      total > 0 ? (promoters * HAPPINESS_INDEX_MULTIPLIER) / total : 0;
    const avgNPSRating =
      totalNPSResponses > 0 ? totalScore / totalNPSResponses : 0;

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
