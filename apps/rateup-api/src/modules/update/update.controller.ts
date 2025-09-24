import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger";
import {
  updateFreePlanExpiry,
  updatePlanFeatures,
  updateRateupPlanFeature,
  updateSubscriptionAutomation,
  updateUsageStatsAutomation,
  updateUsageStatsTemplateMessageCount,
} from "./update.service";
import prisma from "../../utils/prisma";
import { StageCategory } from "../../../generated/prisma/enums";

export async function updateUsageStatsTemplateMessageHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await updateUsageStatsTemplateMessageCount();
    reply.code(200).send("success");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateSubscriptionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await updateSubscriptionAutomation();
    // Logic to update subscription goes here
    // This is a placeholder for the actual implementation
    reply.code(200).send("Subscription updated successfully");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateRateupPlanFeatureHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await updateRateupPlanFeature();
    reply.code(200).send("plans updated successfully");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
export async function updateUsageStatsAutomationHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await updateUsageStatsAutomation();
    reply.code(200).send("usage stats updated successfully");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updatePlanFeaturesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await updatePlanFeatures();
    reply.code(200).send("plans updated successfully");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateFreePlanExpiryHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await updateFreePlanExpiry();
    reply.code(200).send("success");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
export async function updateDefaultLifecycleHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const stages = await prisma.lifecycle.count();
    if (stages > 0) {
      return reply.code(400).send("lifecycle already exists");
    }
    const orgs = await prisma.org.findMany();
    for await (const org of orgs) {
      await seedDefaultStages(org.id);
    }
    reply.code(200).send("default lifecycle added successfully");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function seedDefaultStages(orgId: string) {
  const stages = [
    {
      name: "New Lead",
      ordering: 1,
      isDefault: true,
      category: StageCategory.active,
      emoji: "🆕",
      description: "The Contact has shown interest for the first time.",
      isWon: false,
    },
    {
      name: "Cold Lead",
      ordering: 1,
      isDefault: false,
      category: StageCategory.lost,
      emoji: "🧊",
      description:
        "The Contact has stopped showing interest and is no longer responsive.",
      isWon: false,
    },
    {
      name: "Hot Lead",
      ordering: 2,
      isDefault: false,
      category: StageCategory.active,
      emoji: "🔥",
      description:
        "The Contact is actively interested and ready to move forward.",
      isWon: false,
    },
    {
      name: "Payment",
      ordering: 3,
      isDefault: false,
      category: StageCategory.active,
      emoji: "💵",
      description:
        "The Contact is considering your offer and payment is in progress.",
      isWon: false,
    },
    {
      name: "Customer",
      ordering: 4,
      isDefault: false,
      category: StageCategory.won,
      emoji: "🤩",
      description:
        "The Contact has made a purchase and is now a paying customer.",
      isWon: true,
    },
  ];

  await prisma.lifecycle.createMany({
    data: stages.map((stage) => ({
      ...stage,
      orgId,
    })),
  });
}
