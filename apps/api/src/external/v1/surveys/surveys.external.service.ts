import prisma from "../../../utils/prisma.js";
import { primaryIdentitySql } from "../../../modules/contacts/identity/contactFields.js";

interface ResponseBySurveyRawRow {
  id: string;
  createdAt: Date;
  responses: QuestionResponse[];
  language: string;
  tag: string | null;
  surveyTeamMapId: string;
  teamId: string;
  questions: Question[];
  phone: string | null;
}

/**
 * Every response to one of the org's surveys, with each answer labelled by its question's
 * title — v1's original shape.
 *
 * The dashboard query this replaced had no org filter (any key could read any org's
 * responses given a survey id) and an `INNER JOIN "WaFlow" ON wf."surveyId" = <id>` that
 * joined nothing to the row: it repeated every response once per flow on the survey, and
 * returned nothing for a survey without one. Another org's survey now reads as an empty
 * list, as an unknown id always has.
 */
export async function getResponsesBySurveyId(surveyId: string, orgId: string) {
  const responses = await prisma.$queryRaw<ResponseBySurveyRawRow[]>`
  SELECT sr.id, sr."createdAt",
      sr.responses,
      sr.language, sr.tag, sr."surveyTeamMapId", s.questions, stm."teamId",
      ${primaryIdentitySql("co", "phone")} AS phone
  FROM "SurveyResponse" sr
  INNER JOIN "SurveyTeamMap" stm ON sr."surveyTeamMapId" = stm.id
  INNER JOIN "Survey" s ON s.id = stm."surveyId"
  LEFT JOIN "Contact" co ON sr."contactId" = co.id
  WHERE stm."surveyId" = ${surveyId}::uuid
    AND s."orgId" = ${orgId}::uuid`;

  return responses.map(({ id, createdAt, tag, phone, language, teamId, responses, questions }) => {
    // questionId -> title, for labelling each answer.
    const questionMap = questions.reduce<Record<string, string | undefined>>(
      (map, { id, title, description, label }) => {
        map[id] =
          Object.values(title)?.[0] ||
          Object.values(description)?.[0] ||
          Object.values(label ?? {})?.[0];
        return map;
      },
      {},
    );
    const updatedResponses = responses.map(({ questionId, response = {}, ...rest }) => ({
      ...rest,
      response: Object.values(response)?.[0],
      title: questionMap[questionId],
    }));

    return {
      id,
      createdAt,
      tag,
      phone,
      language,
      teamId,
      responses: updatedResponses,
    };
  });
}

export async function getSurveyList(orgId: string) {
  return prisma.survey.findMany({
    where: { orgId },
    select: { id: true, title: true, type: true },
  });
}
