import prisma, { excludeFields } from "../../utils/prisma";
import {
  CreateSurveyInput,
  DeleteTeamSurveyInput,
  UpdateGoogleLinkInput,
  UpdateSurveyInput,
  UpdateSurveyPassword,
} from "./survey.schema";
import { getTeamById, getTeamIdsByUserId } from "../team/team.service";
import { QuestionType } from "../../types/enums";
import { log } from "../../utils/logger";
import {
  getShortUrlId,
  shortIdUniqueConstraintErrHandler,
} from "../../utils/commnUtils";
import { getSurveysOrgId, isShortId } from "./survey.utils";
import { offerArrayWithRange } from "../../utils/survey/offer";

// TODO: fix return type
// should throw error on error instead of returning error message as string
export async function createSurvey(
  data: CreateSurveyInput & { orgId: string },
  req,
) {
  const { userId: createdBy, email: notificationEmail, orgId } = req?.user;

  const { templateId, ...input } = data;
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
          webSurveyThemeId: defaultThemeId,
        },
      });
      return survey;
    };

    const survey = await shortIdUniqueConstraintErrHandler(createRecord);
    if (survey) {
      if (data.teamIds.length > 0) {
        let team = await getTeamById(data.teamIds[0]);
        await prisma.usageStats.update({
          where: { orgId: team.orgId },
          data: { surveysCount: { increment: 1 } },
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
      await prisma.usageStats.update({
        where: { orgId: team.orgId },
        data: { surveysCount: { increment: 1 } },
      });
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
          surveyStats: true,
        },
      },
    },
  });

  if (!survey) {
    throw new Error(`Could not find survey with id ${id}`);
  }

  let teams = survey?.teams?.map((team) => {
    const teamData = {
      id: team?.team?.id,
      name: team?.team?.name,
      surveyStats: team?.surveyStats,
      mapId: team?.id,
      code: team.team.code,
      tags: team.team.tags,
      shortUrlId: team.shortUrlId,
    };
    return teamData;
  });

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
      survey: true,
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

  let orgLogo = { orgLogo: org?.org?.logo };

  let publicSurvey = {
    surveyTeamMapId,
    ...surveyTeamMap.survey,
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
              whatsappSettings: {
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

  return surveyTeamMap?.team?.org?.whatsappSettings?.phone;
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
  includeQuestions?: boolean,
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
    },
  });

  let surveyTeamOptimized = surveyRes.map((survey) => {
    const optimizedTeams = survey.teams.map((team) => {
      return {
        id: team.teamId,
        name: team.team.name,
        mapId: team.id,
      };
    });
    return { ...survey, teams: optimizedTeams };
  });

  const surveys = surveyTeamOptimized?.map((survey) => {
    return excludeFields(survey, [
      includeQuestions ? undefined : "questions",
      "password",
    ]);
  });

  return surveys;
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
    include: {
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
    include: {
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
        },
      },
    },
  });

  const data = allSurveys?.map((survey) => {
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
    totalSurveysCount: allSurveys?.length,
    surveys: data,
  };

  return summaryData;
}

//------------get survey templates list --------
export async function getSurveyTemplates(surveyType: string) {
  const teamId =
    process.env.SURVEY_TEMPLATES_TEAM_ID ||
    "591ec71f-984e-46b0-88e9-1ef46db9f33a";
  const surveyTeamMaps = await prisma.surveyTeamMap.findMany({
    where: {
      teamId: teamId,
    },
    include: {
      survey: true,
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
    await prisma.usageStats.update({
      where: { orgId: orgId },
      data: { surveysCount: { decrement: 1 } },
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
      await prisma.usageStats.update({
        where: { orgId: team.orgId },
        data: { surveysCount: { decrement: 1 } },
      });
    }
    return deletedSurvey;
  }
}

//------------UPDATE SURVEY by id --------
export async function updateSurveyById(id: string, input: UpdateSurveyInput) {
  let action = "edit";
  if ("isPublished" in input) {
    action = "publish";
    if (input?.isPublished === true) {
      //check for all language inputs
      const fetchedSurvey = await prisma.survey.findUnique({
        where: {
          id,
        },
      });

      if (fetchedSurvey?.questions.length < 1) {
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

  const survey = await prisma.survey.update({
    where: {
      id,
    },
    data: dataInput,
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
      (lang) => !titleLanguages.includes(lang),
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
    team: { googleLink },
  } = await prisma.surveyTeamMap.findUnique({
    where: {
      id: surveyTeamMapId,
    },
    select: {
      team: {
        select: {
          googleLink: true,
        },
      },
    },
  });
  return googleLink;
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
    surveyStats = await prisma.surveyStats.update({
      where: { surveyTeamMapId: id },
      data: { visited: { increment: 1 } },
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      // Record not found error
      surveyStats = await prisma.surveyStats.create({
        data: { surveyTeamMapId: id, visited: 1 },
      });
    } else {
      throw error;
    }
  }
  return surveyStats;
}

export async function updateStartedSurvey(id: string) {
  let surveyStats;
  try {
    surveyStats = await prisma.surveyStats.update({
      where: { surveyTeamMapId: id },
      data: { started: { increment: 1 } },
    });
  } catch (error: any) {
    log.error(error);
    if (error?.code === "P2025") {
      // Record not found error
      surveyStats = await prisma.surveyStats.create({
        data: { surveyTeamMapId: id, visited: 1 },
      });
    } else {
      throw error;
    }
  }
  return surveyStats;
}

export async function updateCompletedSurvey(id: string) {
  let surveyStats;
  try {
    surveyStats = await prisma.surveyStats.update({
      where: { surveyTeamMapId: id },
      data: { completed: { increment: 1 } },
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      // Record not found error
      surveyStats = await prisma.surveyStats.create({
        data: { surveyTeamMapId: id, completed: 1 },
      });
    } else {
      throw error;
    }
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

//TODO REMOVE LATER: MYG GIFT VISHU

function getRandomGift(price) {
  if (price > 100000) {
    price = 100001;
  }
  let range = offerArrayWithRange.find(
    (r) => price >= r.range[0] && price <= r.range[1],
  );
  if (!range) return null; // Price is out of range

  return range.gifts[Math.floor(Math.random() * range.gifts.length)];
}

export async function getGiftByPrice(price: number) {
  const gift = getRandomGift(price);

  return {
    price,
    ...gift,
  };
}

export async function getGiftByPhone(mobileNumber: number) {
  const invoices = await prisma.myGInvoice.findMany({
    where: {
      mobileNumber: mobileNumber.toString(),
    },
  });

  if (invoices.length < 1) {
    throw new Error("NO_INVOICE_ERROR");
  }

  let eligibleInvoices = invoices.filter((inv) => inv.giftRedeemed === false);
  let redeemedInvoices = invoices.filter((inv) => inv.giftRedeemed === true);

  if (redeemedInvoices.length > 0 && eligibleInvoices.length < 1) {
    redeemedInvoices.sort((a, b) => a.redeemAttempt - b.redeemAttempt);

    const groupedByRedeemAttempt = redeemedInvoices.reduce((acc, item) => {
      if (!acc[item.redeemAttempt]) {
        acc[item.redeemAttempt] = [];
      }
      acc[item.redeemAttempt].push(item);
      return acc;
    }, {});

    const uniqueGifts = Object.values(groupedByRedeemAttempt).map(
      (group) => group[0],
    );

    const output = uniqueGifts.map((gift, index) => `#${gift.gift}`).join(", ");

    throw new Error("GIFT CLAIMED ALREADY  :  " + output);
  }

  const highestRedeemAttempt =
    redeemedInvoices.length > 0
      ? redeemedInvoices.reduce(
          (max, item) => Math.max(max, item.redeemAttempt),
          -Infinity,
        )
      : 0;

  const sumOfInvoiceValues = eligibleInvoices?.reduce(
    (acc, invoice) => acc + invoice.invoiceValue,
    0,
  );

  if (sumOfInvoiceValues < 5000) {
    throw new Error("LESS_AMOUNT_ERROR");
  }

  const gift = getRandomGift(sumOfInvoiceValues);

  if (gift) {
    const updatedInvoices = await prisma.myGInvoice.updateMany({
      where: {
        id: {
          in: eligibleInvoices.map((invoice) => invoice.id),
        },
      },
      data: {
        giftRedeemed: true,
        gift: gift.name,
        redeemAttempt: highestRedeemAttempt + 1,
      },
    });

    return {
      sumOfInvoiceValues,
      ...gift,
    };
  }
  throw new Error("Unknown");
}

export async function getIsResponseExist(
  surveyTeamMapId: string,
  phoneNo: string,
) {
  const surveyResponse = await prisma.surveyResponse.findMany({
    where: {
      surveyTeamMapId,
    },
  });
  const filteredData = surveyResponse
    ?.map((data) => data?.responses)
    .filter((subArray) => {
      const hasContactWithPhoneNumber = subArray.some(
        (item: { type: string; response: any }) => {
          return (
            item.type === QuestionType.Contact &&
            item.response?.Contact?.phone === phoneNo
          );
        },
      );
      const hasWinItem = subArray.some((item: { type: string }) => {
        return item.type === QuestionType.WinItem;
      });

      return hasContactWithPhoneNumber && hasWinItem;
    });
  return filteredData?.length ?? 0;
}

export async function getInvoicesByPhone(mobileNumber: number) {
  const invoices = await prisma.myGInvoice.findMany({
    where: {
      mobileNumber: mobileNumber.toString(),
    },
  });

  return invoices;
}

export async function updateInvoice(id: string, gift: string) {
  const invoices = await prisma.myGInvoice.update({
    where: {
      id,
    },
    data: {
      giftRedeemed: true,
      gift: gift,
      redeemAttempt: {
        increment: 1,
      },
    },
  });
  return invoices;
}
