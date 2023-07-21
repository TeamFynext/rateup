import prisma, { excludeFields } from "../../utils/prisma";
import { CreateSurveyInput, UpdateSurveyInput, UpdateSurveyPassword } from "./survey.schema";
import { getTeamsByUserId } from "../team/team.service";
const CryptoJS = require('crypto-js');
const secretPassphrase = 'rateup-#$%^@#-passphrase';

export async function createSurvey(
  input: CreateSurveyInput,
  createdBy: string
) {
  const survey = await prisma.survey.create({
    data: { ...input, createdBy },
  });
  return survey;
}

export async function cloneSurvey(surveyId: string, userId: string) {
  const survey = await prisma.survey.findUnique({
    where: {
      id : surveyId
    },
  });

  if(survey){
    const { id, ...surveyWithoutId } = survey;

    const existingSurveys = await prisma.survey.findMany({
      where: {
        title: {
          startsWith: survey.title + ' Copy',
        },
      },
    });

    let maxCopyNumber = 0;
    existingSurveys.forEach((existingSurvey) => {
      const copyNumber = parseInt(existingSurvey.title.split(' Copy ')[1]);
      if (copyNumber > maxCopyNumber) {
        maxCopyNumber = copyNumber;
      }
    });

    const clonedSurvey = {
      ...surveyWithoutId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: null,
      title: `${survey.title} Copy ${maxCopyNumber + 1}`,
    };
  
    const newSurvey = await prisma.survey.create({
      data: clonedSurvey,
    });
  
    return newSurvey;

  }else{
    return "Survey not found to duplicate"
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

/**
 * Returns surveys from ALL TEAMs in which the user is a member of
 * @param userId 
 * @returns Array of surveys without questions
 */
export async function getSurveysByUserId(userId: string) {
  const teamData = await getTeamsByUserId(userId);
  const teamIds: string[] = teamData.map((item: { teamId: string }) => item.teamId);
  const surveys = await prisma.survey.findMany({
    where: {
      teamId: {
        in: teamIds,
      },
    }
  });

  const surveysWithoutQuestions = surveys.map((s) => excludeFields(s, ["questions", "password"]))
  return surveysWithoutQuestions;
}

export async function getSurveysByTeam(teamId: string) {
  const surveys = await prisma.survey.findMany({
    where: {
      teamId
    }
  });

  const surveysWithoutQuestions = surveys.map((s) => excludeFields(s, ["questions", "password"]))
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


export async function updateSurveyPassword(id: string, data: UpdateSurveyPassword) {
  let isProtected = true;
  let password = data.password;
  try {
    if (data.password === '_remove_pwd') {
      isProtected = false;
      password = ""
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

export async function verifySurveyPassword(id: string, data: UpdateSurveyPassword) {
  let enteredPassword = data.password;
  try {
    const survey = await prisma.survey.findUnique({
      where: { id },
    });
    if (!survey) {
      throw new Error(`Survey not found`);
    }

    const decryptedPassword = CryptoJS.AES.decrypt(survey.password, secretPassphrase).toString(CryptoJS.enc.Utf8);

    if (survey.isProtected && decryptedPassword === enteredPassword) {
      return "Access granted"
    } else {
      return "Password Error"
    }
  } catch (error) {
    throw new Error(`Internal server error`);
  }
}


export async function updateVisitedSurvey(id: string) {
  let surveyStats
  try {
    surveyStats = await prisma.surveyStats.update({
      where: { surveyId: id },
      data: { visited: { increment: 1 } },
    })
  } catch (error: any) {
    if (error?.code === 'P2025') { // Record not found error
      surveyStats = await prisma.surveyStats.create({
        data: { surveyId: id, visited: 1 },
      })
    } else {
      throw error
    }
  }
  return surveyStats;

}

export async function updateStartedSurvey(id: string) {
  let surveyStats
  try {
    surveyStats = await prisma.surveyStats.update({
      where: { surveyId: id },
      data: { started: { increment: 1 } },
    })
  } catch (error: any) {
    if (error?.code === 'P2025') { // Record not found error
      surveyStats = await prisma.surveyStats.create({
        data: { surveyId: id, visited: 1 },
      })
    } else {
      throw error
    }
  }
  return surveyStats;

}

export async function updateCompletedSurvey(id: string) {
  let surveyStats
  try {
    surveyStats = await prisma.surveyStats.update({
      where: { surveyId: id },
      data: { completed: { increment: 1 } },
    })
  } catch (error: any) {
    if (error?.code === 'P2025') { // Record not found error
      surveyStats = await prisma.surveyStats.create({
        data: { surveyId: id, completed: 1 },
      })
    } else {
      throw error
    }
  }
  return surveyStats;


}