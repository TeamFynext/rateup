import { QuestionType, SurveyVariableType } from "../../types/enums.js";
import prisma from "../../utils/prisma.js";
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

/**
 * The DEFAULT variables a question contributes at a given position.
 *
 * Names are derived purely from the 1-based position, so they are only correct
 * for a question list rebuilt as a whole — see `updateSurveyVariables`. Question
 * types not listed here contribute nothing.
 */
export function defaultVariablesForQuestion(
  // Only the question's id and type are read here.
  question: Pick<Question, "id" | "type"> | undefined,
  position: number,
): surveyVariableInput[] {
  const suffixes = defaultVariableSuffixes(question?.type);
  if (!suffixes || !question) return [];
  return suffixes.map((suffix) => ({
    name: `Q${position + 1}${suffix}`,
    value: question.id,
    type: SurveyVariableType.DEFAULT,
  }));
}

/** Name suffixes for a question type, or null when it carries no variable. */
function defaultVariableSuffixes(type: Question["type"] | undefined) {
  switch (type) {
    case QuestionType.Contact:
      return ["_name_response", "_phone_response", "_email_response"];
    case QuestionType.Testimonial:
      return ["_name_response", "_jobTitle_response", "_testimonial_response", "_rating_response"];
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
      return ["_response"];
    default:
      return null;
  }
}
