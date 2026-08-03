import { QuestionType } from "../../types/enums.js";
import { log } from "../../utils/logger.js";
import prisma from "../../utils/prisma.js";
import { CreateResponseInput } from "../response/response.schema.js";
import { createTestimonialSchama } from "./testimonial.schema.js";

export async function createTestimonial(responseData: CreateResponseInput, responseId: string) {
  const hasTestimonialResponse = responseData.responses.some(
    (res) => res?.type === QuestionType.Testimonial,
  );
  if (!hasTestimonialResponse) return;
  const testimonialRes = responseData.responses.filter(
    (res) => res.type == QuestionType.Testimonial,
  );

  const rows = testimonialRes.flatMap((tr) => {
    const candidate = {
      responseId,
      testimonial: {
        questionId: tr.questionId,
        name: tr.response[tr.type]?.name,
        jobTitle: tr.response[tr.type]?.jobTitle,
        testimonial: tr.response[tr.type]?.testimonial,
        rating: tr.response[tr.type]?.rating,
        photo: tr.response[tr.type]?.photo,
      },
    };
    const parsed = createTestimonialSchama.safeParse(candidate);
    if (!parsed.success) {
      log.warn(
        { responseId, questionId: tr.questionId, issues: parsed.error.issues },
        "Skipping a testimonial answer that does not match the expected shape",
      );
      return [];
    }
    return [candidate];
  });

  if (!rows.length) return;

  await prisma.testimonial.createMany({
    data: rows,
    // (testimonial, responseId) is unique, so a survey with two testimonial
    // questions answered identically raised P2002 — which, in the caller's
    // Promise.all, abandoned the rest of the post-response work. See 32.2.
    skipDuplicates: true,
  });
}

export async function getAllTestimonialBySurveyId(surveyId: string, orgId: string) {
  let testimonials = await prisma.testimonial.findMany({
    where: {
      surveyResponse: {
        surveyTeamMap: {
          surveyId,
          team: {
            orgId,
          },
        },
      },
    },
    // Was an unprojected row plus the whole SurveyTeamMap, which handed the
    // caller the internal surveyId, teamId and shortUrlId per testimonial.
    select: {
      id: true,
      createdAt: true,
      testimonial: true,
    },
  });
  return testimonials;
}

export async function getAllTestimonialByOrgId(orgId: string) {
  let testimonials = await prisma.testimonial.findMany({
    where: {
      surveyResponse: {
        surveyTeamMap: {
          team: {
            orgId,
          },
        },
      },
    },
    select: {
      id: true,
      createdAt: true,
      testimonial: true,
      surveyResponse: {
        select: {
          surveyTeamMap: {
            select: {
              survey: true,
              team: true,
            },
          },
        },
      },
    },
  });
  return testimonials
    .filter((t) => t.surveyResponse?.surveyTeamMap?.survey && t.surveyResponse.surveyTeamMap.team)
    .map(
      ({
        id,
        surveyResponse: {
          surveyTeamMap: { survey, team },
        },
        createdAt,
        testimonial,
      }) => ({
        id,
        createdAt,
        testimonial,
        teamId: team.id,
        survey: { id: survey.id, name: survey.title },
      }),
    );
}
