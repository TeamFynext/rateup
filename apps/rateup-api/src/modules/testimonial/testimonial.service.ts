import { QuestionType } from "../../types/enums.js";
import prisma from "../../utils/prisma.js";
import { CreateResponseInput } from "../response/response.schema.js";

export async function createTestimonial(responseData: CreateResponseInput, responseId) {
  const hasTestimonialResponse = responseData.responses.some(
    (res) => res?.type === QuestionType.Testimonial,
  );
  if (!hasTestimonialResponse) return;
  const testimonialRes = responseData.responses.filter(
    (res) => res.type == QuestionType.Testimonial,
  );
  await prisma.testimonial.createMany({
    data: testimonialRes.map((tr) => {
      return {
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
    }),
  });
}

export async function getAllTestimonialBySurveyId(surveyId) {
  let testimonials = await prisma.testimonial.findMany({
    where: {
      surveyResponse: {
        surveyTeamMap: {
          surveyId,
        },
      },
    },
    include: {
      surveyResponse: {
        select: {
          surveyTeamMap: true,
        },
      },
    },
  });
  return testimonials;
}

export async function getAllTestimonialByOrgId(orgId) {
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
  return testimonials.map(
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
