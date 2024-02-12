import { generateAnswerHtml } from "../../utils/email/emailTemplateGenerateFunction";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail";
import { createEmailBodySurveyResponse } from "../../utils/email/supertoken/surveyResponseEmail";
import prisma from "../../utils/prisma";
import { generateResponseData } from "../../utils/survey/response.data";
import { CreateResponseInput, GenerateBodyInput } from "./response.schema";

export async function getResponses(surveyTeamMapId: string) {
  const responses = await prisma.surveyResponse.findMany({
    where: {
      surveyTeamMapId,
    },
  });
  return responses;
}

export async function getAllResponses(
  surveyId: string,
  teamIds: Array<string>,
) {
  const responses = await prisma.surveyTeamMap.findMany({
    where: {
      surveyId: surveyId,
      teamId: {
        in: teamIds,
      },
    },
    select: {
      id: true,
      _count: {
        select: {
          responses: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      responses: {
        select: {
          id: true,
          language: true,
          tag: true,
          responses: true,
          createdAt: true,
        },
      },
    },
  });
  return responses;
}

export async function resetResponsesStats(surveyTeamMapId: string) {
  const deleteResponses = await prisma.surveyResponse.deleteMany({
    where: {
      surveyTeamMapId,
    },
  });

  const deleteStats = await prisma.surveyStats.deleteMany({
    where: {
      surveyTeamMapId,
    },
  });

  const deletionMessage = `Deleted.. ${deleteResponses.count} survey responses for survey ID: ${surveyTeamMapId}`;
  return deletionMessage;
}

export async function deleteResponse(id: string) {
  const deleteResponse = await prisma.surveyResponse.delete({
    where: {
      id,
    },
  });

  return deleteResponse;
}

export async function createResponse(input: CreateResponseInput) {
  const surveyResponse = await prisma.surveyResponse.create({
    data: {
      ...input,
      tag: input.tag,
      surveyTeamMapId: input.surveyTeamMapId,
      language: input.language,
      responses: input.responses,
    },
    include: {
      surveyTeamMap: {
        include: {
          survey: {
            select: {
              questions: true,
            },
          },
        },
      },
    },
  });

  return surveyResponse;
}
interface Location {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  city: string;
  state: string;
  country: string;
}
export async function updateResponse(
  responseId: string,
  data: { ip: string; location: Location },
) {
  const response = await prisma.surveyResponse.update({
    where: {
      id: responseId,
    },
    data: {
      ip: data.ip,
      location: data.location as any,
    },
  });
  return response;
}

export async function sendEmailOnResponseCreation(id: string, surveyResponse) {
  const response = await prisma.surveyTeamMap.findFirst({
    where: { id },
    include: {
      survey: {
        select: {
          notificationEmail: true,
          enableNotificationEmail: true,
          id: true,
          title: true,
        },
      },
    },
  });
  const { survey } = response ?? {};

  if (survey?.enableNotificationEmail && survey.notificationEmail) {
    const { notificationEmail } = survey;
    const surveyQuestion =
      surveyResponse?.surveyTeamMap?.survey?.questions ?? [];
    const surveyAnswer = surveyResponse?.responses ?? [];
    const language = surveyResponse?.language;
    const combineArray = surveyQuestion.map((qs) => ({
      ...qs,
      response:
        surveyAnswer.find(
          (ans: { questionId: string }) => ans.questionId === qs.id,
        )?.response || {},
    }));
    const bodyJsx = combineArray
      ?.map((data) => {
        const questionText = language
          ? data?.title[language]
          : Object.values(data?.title)[0];
        const answerText = generateAnswerHtml(
          Object.values(data?.response)[0],
          data.type,
        );
        return (
          answerText &&
          `<tr>
              <td class="question-answer-body"><strong style="font-size: 18px;">${questionText}</strong></td>
            </tr>
            <tr>
              <td class="question-answer-body">${answerText}</td>
            </tr>
          `
        );
      })
      .join("");
    const msg = {
      to: notificationEmail,
      subject: "RateUp: New Survey Response",
      text: "survey response.",
      html: createEmailBodySurveyResponse(
        `${process.env.FRONTEND_URL}/dashboard/surveys/${survey?.id}?tab=Result`,
        bodyJsx,
        survey?.title,
      ),
    };
    await sendAWSEmail(msg);
  }
  return "response";
}

export const generateResponse = async (body: GenerateBodyInput) => {
  let data: any = [];
  const survey = await prisma.survey.findFirst({
    where: {
      id: body.surveyId,
    },
    select: {
      questions: true,
      languages: true,
      type: true,
    },
  });

  for (let index = 0; index < body.batchSize; index++) {
    data.push(generateResponseData(body.surveyTeamMapId, survey));
  }
  await prisma.surveyResponse.createMany({
    data,
  });
  return data;
};
