import { FastifyReply, FastifyRequest } from "fastify";
import { updateGoogleReviewQuestionsInDB } from "./migrationFiles/update-google-review-questions";
import { log } from "../../utils/logger";
import { updateWebSurveyPagesThemeTitle } from "./migrationFiles/update-theme-title";
import { updateUsageStatsReset } from "./migrationFiles/update-usage-stats";
import { campaignStatsUpdate } from "./migrationFiles/CampaignStatsUpdate";
import prisma from "../../utils/prisma";

export async function updateGoogleReviewQuestions(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const result = await updateGoogleReviewQuestionsInDB();
    reply.status(200).send({
      success: true,
      message: "update GoogleReviewQuestions successfully.",
    });
  } catch (err) {
    reply.status(500).send({
      success: false,
      message: "Something went wrong while updating GoogleReviewQuestions.",
    });
  }
}

export async function updateWebSurveyThemePageTitleHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await updateWebSurveyPagesThemeTitle();
    reply.code(200).send("success");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateUsageStatsResetHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await updateUsageStatsReset();
    reply.code(200).send("success");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function campaignStatsChangeHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await campaignStatsUpdate();
    reply.code(200).send("success");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateRateupPlanHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const rateupplans = await prisma.rateupPlan.findMany();
    for (const plan of rateupplans) {
      const features = plan.features as unknown as SubscriptionFeatures;
      const newfeatures = {
        ...features,
        ai: { count: { completionTokens: 0, promptTokens: 0 }, active: false },
      };
      await prisma.rateupPlan.update({
        where: {
          id: plan.id,
        },
        data: {
          features: newfeatures,
        },
      });
      if (plan.name === "FREE PLAN") {
        const subscriptions = await prisma.subscription.findMany({
          where: {
            basePlan: {
              id: plan.id,
            },
          },
        });
        for (const sub of subscriptions) {
          const subFeatures = sub.features as unknown as SubscriptionFeatures;
          if (!subFeatures.ai) {
            const updateFeature = {
              ...subFeatures,
              ai: {
                count: { completionTokens: 0, promptTokens: 0 },
                active: false,
              },
            };
            await prisma.subscription.update({
              where: {
                orgId: sub.orgId,
              },
              data: {
                features: updateFeature,
              },
            });
          }
        }
      }
    }
    reply.code(200).send("success");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateContactMessageTimeHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const res = await prisma.$executeRaw`WITH latest_messages AS (
      SELECT DISTINCT ON (w."contactId") 
        w."contactId",
        w."waCreatedAt"
      FROM "WaMessage" w
      WHERE w."messageBody"->>'exchangeProcess' = 'receive'
      ORDER BY w."contactId", w."waCreatedAt" DESC
    )
    UPDATE "Contact" c
    SET "lastReceivedMessageTimeStamp" = lm."waCreatedAt"
    FROM latest_messages lm
    WHERE c.id = lm."contactId";
    `;
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateInboxStatusHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const res = await prisma.$executeRaw`
      UPDATE "Contact"
      SET "waMessageAssignStatus" = 'UNASSIGNED'
      WHERE "waMessageAssignStatus" = 'NEW';
      `;
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
