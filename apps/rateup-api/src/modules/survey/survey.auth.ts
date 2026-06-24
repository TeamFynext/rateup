import { FastifyRequest, FastifyReply } from "fastify";
import { hasAccessToSurvey, hasAccessToTeam } from "../../utils/auth.js";
import { CreateSurveyInput } from "./survey.schema.js";
import { GetSurveyByIdParams } from "./survey.schema.js";
import prisma from "../../utils/prisma.js";
import { SubscriptionFeaturePathName, SurveyType } from "../../types/enums.js";
import { sendUsageLimitMailAlert } from "../../utils/email/payments/usageLimitAlert.js";
import dayjs from "dayjs";
import { sendSubscriptionExpiryAlertEmail } from "../../utils/email/payments/subscriptionExpiryAlert.js";

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
    // Body: CreateSurveyInput;
  }>,
  reply: FastifyReply,
) {
  const orgId = request.user.orgId;

  const count = await prisma.survey.count({
    where: {
      type: SurveyType.Web,
      teams: {
        some: {
          team: {
            orgId: orgId,
          },
        },
      },
    },
  });

  if (count >= request.subscription.features[SubscriptionFeaturePathName.WebSurvey].count.max) {
    await sendUsageLimitMailAlert(orgId);
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

  if (!surveyTeamMap) {
    reply.code(404).send({
      message: "Survey not found...!",
      displayMessageInClient: true,
    });
  }

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

  //check subscription expiry
  if (dayjs().isAfter(subscription.expiresAt)) {
    await sendSubscriptionExpiryAlertEmail(subscription);
    return reply.code(403).send({
      message: "Your subscription has been expired",
      displayMessageInClient: true,
    });
  }

  if (
    usage.monthlySurveyResponses >=
    subscription.features[SubscriptionFeaturePathName.WebSurvey].count.monthlyResponseLimit
  ) {
    await sendUsageLimitMailAlert(orgId);
    reply.code(403).send({
      message: "You have reached the maximum monthly limit of surveys responses.",
      displayMessageInClient: true,
    });
  }
}
