import { QuestionType, SurveyType, SurveyVariableType } from "../../types/enums.js";
import prisma from "../../utils/prisma.js";
import { createSurveyVariable, getSurveyById } from "./survey.service.js";
import { surveyVariableInput } from "./survey.schema.js";

export function isShortId(id: string) {
  return id.length === 8;
}

export async function getSurveysOrgId(surveyId: string) {
  const surveyTeamMap = await prisma.surveyTeamMap.findFirst({
    where: {
      surveyId: surveyId,
    },
    include: {
      team: true,
    },
  });
  return surveyTeamMap!.team.orgId;
}

export async function getSurveyTeamMapIdFromShortId(shortId: string) {
  const res = await prisma.surveyTeamMap.findFirst({
    where: {
      shortUrlId: shortId,
    },
    select: {
      id: true,
    },
  });

  return res?.id;
}

export async function createSurveyDefaultVariableForQuestion(
  surveyId: string,
  // Only the question's id and type are read here.
  question: Pick<Question, "id" | "type"> | undefined,
  position: number,
) {
  const survey = await getSurveyById(surveyId);
  if (survey.type !== SurveyType.Web) return;
  const variables: surveyVariableInput[] = [];
  let variable: surveyVariableInput | null = null;
  switch (question?.type) {
    case QuestionType.Contact:
      variables.push({
        name: `Q${position + 1}_name_response`,
        value: question?.id,
        type: SurveyVariableType.DEFAULT,
      });
      variables.push({
        name: `Q${position + 1}_phone_response`,
        value: question?.id,
        type: SurveyVariableType.DEFAULT,
      });
      variables.push({
        name: `Q${position + 1}_email_response`,
        value: question?.id,
        type: SurveyVariableType.DEFAULT,
      });
      break;
    case QuestionType.Testimonial:
      variables.push({
        name: `Q${position + 1}_name_response`,
        value: question?.id,
        type: SurveyVariableType.DEFAULT,
      });
      variables.push({
        name: `Q${position + 1}_jobTitle_response`,
        value: question?.id,
        type: SurveyVariableType.DEFAULT,
      });
      variables.push({
        name: `Q${position + 1}_testimonial_response`,
        value: question?.id,
        type: SurveyVariableType.DEFAULT,
      });
      variables.push({
        name: `Q${position + 1}_rating_response`,
        value: question?.id,
        type: SurveyVariableType.DEFAULT,
      });
      break;
    case QuestionType.Text:
    case QuestionType.Date:
    case QuestionType.LD:
    case QuestionType.Number:
    case QuestionType.Opinion:
    case QuestionType.YN:
    case QuestionType.Rating:
    case QuestionType.Smiley:
    case QuestionType.TextArea:
    case QuestionType.TnC:
    case QuestionType.WOP:
      variable = {
        name: `Q${position + 1}_response`,
        value: question?.id,
        type: SurveyVariableType.DEFAULT,
      };
      break;
    default:
      //Not created variable for remaining question types
      return false;
  }
  if (variables.length) {
    for (const variable of variables) {
      await createSurveyVariable(surveyId, variable);
    }
  }
  if (variable) {
    await createSurveyVariable(surveyId, variable);
  }
}
