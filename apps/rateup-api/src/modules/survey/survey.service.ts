import prisma, { excludeFields } from "../../utils/prisma";
import {
  CreateSurveyInput,
  CreateSurveyLandingInput,
  UpdateGoogleLinkInput,
  UpdateLandingPageInput,
  UpdateSurveyInput,
  UpdateSurveyPassword,
} from "./survey.schema";
import { getTeamsByUserId } from "../team/team.service";
import defaultTheme from "../welcomeTheme/defaultTheme";
const CryptoJS = require("crypto-js");
const secretPassphrase = "rateup-#$%^@#-passphrase";

export async function createSurvey(
  input: CreateSurveyInput,
  createdBy: string
) {
  const survey = await prisma.survey.create({
    data: {
      ...input,
      title: input.title,
      teamId: input.teamId,
      createdBy,
    },
  });
  //-------------create a default landing page theme todo-------------

  let landingData = defaultTheme;

  let LandingPage = await prisma.welcomeTheme.create({
    data: {
      ...landingData,
      headerText: landingData.headerText,
      descText: landingData.descText,
      buttonText: landingData.buttonText,
      headerStyles: landingData.headerStyles,
      descStyles: landingData.descStyles,
      buttonStyles: landingData.buttonStyles,
      bgStyles: landingData.bgStyles,
      logoStyles: landingData.logoStyles,
      surveyId: survey.id,
      bgUrl: landingData.bgUrl,
      bgType: landingData.bgType,
    },
  });

  return survey;
}

//----------------create survey landing-----------------
export async function createSurveyLanding(
  input: CreateSurveyLandingInput,
  createdBy: string
) {
  const Landing = await prisma.surveyLanding.create({
    data: {
      ...input,
      title: input.title,
      // teamId: input.teamId,
      createdBy,
    },
  });
  //-------------create a default landing page theme todo-------------

  let landingData = defaultTheme;

  let LandingPage = await prisma.welcomeTheme.create({
    data: {
      ...landingData,
      headerText: landingData.headerText,
      descText: landingData.descText,
      buttonText: landingData.buttonText,
      headerStyles: landingData.headerStyles,
      descStyles: landingData.descStyles,
      buttonStyles: landingData.buttonStyles,
      bgStyles: landingData.bgStyles,
      logoStyles: landingData.logoStyles,
      landingId: Landing.id,
      bgUrl: landingData.bgUrl,
      bgType: landingData.bgType,
    },
  });
  return Landing;
}
//----------------update survey landing page details-----------------
export async function updateSurveyLanding(
  id,
  input: UpdateLandingPageInput
  // createdBy: string
) {
  const Landing = await prisma.surveyLanding.update({
    where: {
      id,
    },
    data: input,
  });
  return Landing;
}

export async function cloneSurvey(
  surveyId: string,
  userId: string,
  teamId: string
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
        title: {
          startsWith: survey.title,
        },
        teamId: survey.teamId,
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
          `Suffix: '${suffix}', Copy number string: ${copyNumberStr}, Copy number: ${copyNumber}`
        );
        if (!isNaN(copyNumber)) {
          maxCopyNumber = Math.max(maxCopyNumber, copyNumber);
          console.log("Found a valid copy number: ", maxCopyNumber);
        }
      }
    });

    const clonedSurvey = {
      ...surveyWithoutId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: null,
      teamId: teamId,
      title: `${survey.title} Copy ${maxCopyNumber + 1}`,
    };

    const newSurvey = await prisma.survey.create({
      data: clonedSurvey,
    });

    return newSurvey;
  } else {
    return "Survey not found to duplicate";
  }
}

export async function getSurveyById(id: string) {
  const survey = await prisma.survey.findUnique({
    where: {
      id,
    },
    include: {
      surveyStats: true,
    },
  });

  if (!survey) {
    throw new Error(`Could not find survey with id ${id}`);
  }
  return survey;
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

export async function getGoogleUrlBySurveyId(id: string) {
  const survey = await prisma.survey.findUnique({
    where: {
      id,
    },
    select: {
      teamId: true,
    },
  });

  if (survey) {
    const team = await prisma.team.findUnique({
      where: {
        id: survey.teamId,
      },
      select: {
        googleLink: true,
      },
    });

    return team;
  } else {
    return { error: "Survey not found" };
  }
}

/**
 * Returns surveys from ALL TEAMs in which the user is a member of
 * @param userId
 * @returns Array of surveys without questions
 */
export async function getSurveysByUserId(userId: string) {
  const teamData = await getTeamsByUserId(userId);
  const teamIds: string[] = teamData.map(
    (item: { teamId: string }) => item.teamId
  );
  const surveys = await prisma.survey.findMany({
    where: {
      teamId: {
        in: teamIds,
      },
    },
  });

  const surveysWithoutQuestions = surveys.map((s) =>
    excludeFields(s, ["questions", "password"])
  );
  return surveysWithoutQuestions;
}
/**
 * Returns surveys from ALL TEAMs in which the user is a member of
 * @param userId
 * @returns Array of surveys without questions
 */
export async function getWebSurveysByUserId(userId: string) {
  const teamData = await getTeamsByUserId(userId);
  const teamIds: string[] = teamData.map(
    (item: { teamId: string }) => item.teamId
  );
  const surveys = await prisma.survey.findMany({
    where: {
      type:"web",
      teamId: {
        in: teamIds,
      },
    },
  });

  const surveysWithoutQuestions = surveys.map((s) =>
    excludeFields(s, ["questions", "password"])
  );
  return surveysWithoutQuestions;
}

/**
 * Returns summary(responses, stats) of active surveys
 * from ALL TEAMs in which the user is a member of
 * @param userId
 * @returns Array of active surveys - responses, stats
 */
export async function getActiveSurveysSummmaryByUserId(userId: string) {
  const teamData = await getTeamsByUserId(userId);
  const teamIds: string[] = teamData.map(
    (item: { teamId: string }) => item.teamId
  );
  const surveys = await prisma.survey.findMany({
    where: {
      teamId: {
        in: teamIds,
      },
      active: true,
    },
    include: {
      responses: true,
      surveyStats: true,
      team: {
        select: {
          name: true,
        },
      },
    },
  });

  const surveysWithoutQuestions = surveys.map((s) =>
    excludeFields(s, ["questions", "password"])
  );
  return surveysWithoutQuestions;
}

/**
 * returns all whatsapp surveys
 * @param userId
 * @returns
 * @author harshad
 */

export async function getSurveyLandingByUserId(userId: string) {
  const surveysLanding = await prisma.surveyLanding.findMany({
    where: { createdBy: userId },
  });

  return surveysLanding;
}

//------------get landing surevey list --------
export async function getWhatsappSurveysByUserId(userId: string, type: string) {
  const teamData = await getTeamsByUserId(userId);
  const teamIds: string[] = teamData.map(
    (item: { teamId: string }) => item.teamId
  );
  const surveys = await prisma.survey.findMany({
    where: {
      teamId: {
        in: teamIds,
      },

      type,
    },
  });

  const surveysWithoutQuestions = surveys.map((s) =>
    excludeFields(s, ["questions", "password"])
  );
  return surveysWithoutQuestions;
}

export async function getSurveysByTeam(teamId: string) {
  const surveys = await prisma.survey.findMany({
    where: {
      teamId,
    },
  });

  const surveysWithoutQuestions = surveys.map((s) =>
    excludeFields(s, ["questions", "password"])
  );
  return surveysWithoutQuestions;
}

export async function deleteSurveyById(id: string) {
  const survey = await prisma.survey.delete({
    where: {
      id,
    },
  });
  return survey;
}

export async function updateSurveyById(id: string, input: UpdateSurveyInput) {
  const survey = await prisma.survey.update({
    where: {
      id,
    },
    data: input,
  });
  return survey;
}

export async function updateGoogleLink(
  id: string,
  data: UpdateGoogleLinkInput
) {
  const survey = await prisma.survey.findUnique({
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
  data: UpdateSurveyPassword
) {
  let isProtected = true;
  let password = data.password;
  try {
    if (data.password === "_remove_pwd") {
      isProtected = false;
      password = "";
    } else {
      isProtected = true;
      password = CryptoJS.AES.encrypt(password, secretPassphrase).toString();
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
  data: UpdateSurveyPassword
) {
  let enteredPassword = data.password;
  try {
    const survey = await prisma.survey.findUnique({
      where: { id },
    });
    if (!survey) {
      throw new Error(`Survey not found`);
    }

    const decryptedPassword = CryptoJS.AES.decrypt(
      survey.password,
      secretPassphrase
    ).toString(CryptoJS.enc.Utf8);

    if (survey.isProtected && decryptedPassword === enteredPassword) {
      return "Access granted";
    } else {
      return "Password Error";
    }
  } catch (error) {
    throw new Error(`Internal server error`);
  }
}

export async function updateVisitedSurvey(id: string) {
  let surveyStats;
  try {
    surveyStats = await prisma.surveyStats.update({
      where: { surveyId: id },
      data: { visited: { increment: 1 } },
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      // Record not found error
      surveyStats = await prisma.surveyStats.create({
        data: { surveyId: id, visited: 1 },
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
      where: { surveyId: id },
      data: { started: { increment: 1 } },
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      // Record not found error
      surveyStats = await prisma.surveyStats.create({
        data: { surveyId: id, visited: 1 },
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
      where: { surveyId: id },
      data: { completed: { increment: 1 } },
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      // Record not found error
      surveyStats = await prisma.surveyStats.create({
        data: { surveyId: id, completed: 1 },
      });
    } else {
      throw error;
    }
  }
  return surveyStats;
}
