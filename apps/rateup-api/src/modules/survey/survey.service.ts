import prisma, { excludeFields } from "../../utils/prisma";
import {
  CreateSurveyInput,
  DeleteTeamSurveyInput,
  UpdateGoogleLinkInput,
  UpdateSurveyInput,
  UpdateSurveyPassword,
} from "./survey.schema";
import { getTeamIdsByUserId } from "../team/team.service";
import { QuestionType } from "../../types/enums";
import { log } from "../../utils/logger";

// TODO: fix return type
// should throw error on error instead of returning error message as string
export async function createSurvey(
  data: CreateSurveyInput,
  createdBy: string,
  notificationEmail?: string,
) {
  const { templateId, ...input } = data;
  const teamIds = input?.teamIds?.map((teamId) => ({ teamId }));
  delete input.teamIds;

  if (templateId) {
    return cloneSurvey(templateId, createdBy, data.teamIds, true);
  } else {
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
      },
    });
    let surveyRes = { ...survey, teamIds: input?.teamIds };

    return surveyRes;
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
    include: {
      WelcomeTheme: true,
    },
  });

  if (survey) {
    const { id, WelcomeTheme, ...surveyWithoutId } = survey;

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

    const teams = teamIds?.map((teamId) => ({ teamId }));

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

    const newClonedSurvey = await prisma.survey.create({
      data: clonedSurvey,
    });

    let themeData = survey?.WelcomeTheme;

    let addThemeToClonedSurvey = await prisma.welcomeTheme.create({
      data: {
        headerText: themeData.headerText,
        descText: themeData.descText,
        buttonText: themeData.buttonText,
        headerStyles: themeData.headerStyles,
        descStyles: themeData.descStyles,
        buttonStyles: themeData.buttonStyles,
        bgStyles: themeData.bgStyles,
        logoStyles: themeData.logoStyles,
        surveyId: newClonedSurvey.id,
        bgUrl: themeData.bgUrl,
        mobileBgUrl: themeData.mobileBgUrl,
        bgType: themeData.bgType,
        logoUrl: themeData.logoUrl,
      },
    });

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
    };
    return teamData;
  });

  return { ...survey, teams: teams };
  //return survey;
}

//-----------get public survey with org logo -------

export async function getPublicSurveyById(id: string) {
  const surveyTeamMap = await prisma.surveyTeamMap.findUnique({
    where: {
      id,
    },
    include: {
      survey: true,
    },
  });

  if (!surveyTeamMap) {
    throw new Error(`Could not find survey with id ${id}`);
  }

  let org = await prisma.team.findUnique({
    where: {
      id: surveyTeamMap?.teamId,
    },
    include: {
      org: true,
    },
  });

  let orgLogo = { orgLogo: org?.org?.logo };
  let publicSurvey = { ...surveyTeamMap.survey, ...orgLogo };

  return publicSurvey;
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

export async function getSurveysByUserId(userId: string) {
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
    return excludeFields(survey, ["questions", "password"]);
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
//-----Returns summary(responses, stats) of active surveys -- from ALL TEAMs in which the user is a member of

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
      survey: {
        include: {
          WelcomeTheme: true,
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
  const survey = await prisma.survey.delete({
    where: {
      id,
    },
  });
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
      const newSurveyTeams = await prisma.surveyTeamMap.createMany({
        data: newTeams.map((team) => ({ surveyId: id, ...team })),
      });
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
