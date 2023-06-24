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

export async function getSurveyById(id: string) {
  const survey = await prisma.survey.findUnique({
    where: {
      id,
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
