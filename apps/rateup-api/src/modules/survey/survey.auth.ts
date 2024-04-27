import { FastifyRequest, FastifyReply } from "fastify";
import { hasAccessToSurvey, hasAccessToTeam } from "../../utils/auth";
import { CreateSurveyInput } from "./survey.schema";
import { GetSurveyByIdParams } from "./survey.schema";
import prisma from "../../utils/prisma";
import { SubscriptionFeaturePathName } from "../../types/enums";

export async function verifySurveyAccess(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
  }>,
  reply: FastifyReply,
) {
  const surveyId = request.params.id;
  const hasAccess = await hasAccessToSurvey(surveyId, request.userId);

  if (!hasAccess) {
    reply.code(403).send({ message: "You don't have access to this survey" });
  }
}

export async function verifySurveyCreateAccess(
  request: FastifyRequest<{
    Body: CreateSurveyInput;
  }>,
  reply: FastifyReply,
) {
  const teamIds = request.body.teamIds;

  for (let teamId of teamIds) {
    if (!(await hasAccessToTeam(teamId, request.userId))) {
      reply.code(403).send();
      return;
    }
  }
}

export async function verifySurveyMaxCountRestriction(
  request: FastifyRequest<{
    Body: CreateSurveyInput;
  }>,
  reply: FastifyReply,
) {
  const orgId = request.user.orgId;

  const count = await prisma.survey.count({
    where: {
      teams: {
        some: {
          team: {
            orgId: orgId,
          },
        },
      },
    },
  });

  if (
    count >=
    request.subscription.features[SubscriptionFeaturePathName.WebSurvey].count
      .max
  ) {
    reply.code(403).send({
      message: "You have reached the maximum limit of surveys",
      displayMessageInClient: true,
    });
  }
}

export async function verifySurveyMonthlyLimitRestriction(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
  }>,
  reply: FastifyReply,
) {
  let id = request.params.id;
  const surveyTeamMapWhere = id.length === 8 ? { shortUrlId: id } : { id };
  const surveyTeamMap = await prisma.surveyTeamMap.findUnique({
    where: surveyTeamMapWhere,
    include: {
      team: true,
    },
  });

  let orgId = surveyTeamMap.team.orgId;

  const usage = await prisma.usageStats.findUnique({
    where: {
      orgId: orgId,
    },
  });

  const subscription = await prisma.subscription.findUnique({
    where: {
      orgId: orgId,
    },
  });

  if (
    usage.monthlySurveyResponses >=
    subscription.features[SubscriptionFeaturePathName.WebSurvey].count
      .monthlyResponseLimit
  ) {
    reply.code(403).send({
      message:
        "You have reached the maximum monthly limit of surveys responses.",
      displayMessageInClient: true,
    });
  }
}
