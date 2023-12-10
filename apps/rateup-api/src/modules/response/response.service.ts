import { sendAWSEmail } from "../../utils/email/sendAWSEmail";
import { createEmailBodySurveyResponse } from "../../utils/email/supertoken/surveyResponseEmail";
import prisma from "../../utils/prisma";
import { CreateResponseInput } from "./response.schema";

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
  teamIds: Array<string>
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
          language: true,
          tag:true,
          responses: true,
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
  data: { ip: string; location: Location }
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

export async function sendEmailOnResponseCreation(id: string) {
  const response = await prisma.surveyTeamMap.findFirst({
    where: { id },
    include: {
      survey: {
        select: {
          notificationEmail: true,
          enableNotificationEmail: true,
          id: true,
        },
      },
    },
  });
  const { survey } = response ?? {};

  if (survey?.enableNotificationEmail && survey.notificationEmail) {
    const { notificationEmail } = survey;
    const msg = {
      to: notificationEmail,
      subject: "survay response - RateUp.app",
      text: "survay response.",
      html: createEmailBodySurveyResponse(
        `${process.env.FRONTEND_URL}/dashboard/surveys/${survey?.id}?tab=Result`
      ),
    };
    await sendAWSEmail(msg);
  }
  return "response";
}
