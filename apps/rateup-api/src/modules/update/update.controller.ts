import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger.js";
import {
  backfillWithSQL,
  migrateWaTemplatePhoneIds,
  updateFreePlanExpiry,
  migrateFreePlanFeatures,
  updatePlanFeatures,
  updateRateupPlanFeature,
  updateSubscriptionAutomation,
  updateUsageStatsAutomation,
  updateUsageStatsTemplateMessageCount,
  syncTeamFeaturesFromSubscription,
  seedInboxStatsAutomation,
  reconcileInboxStatus,
  backfillConversationsFromMessages,
  backfillConversationSessions,
} from "./update.service.js";
import prisma from "../../utils/prisma.js";
import { StageCategory } from "../../../generated/prisma/enums.js";

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

export async function updateSubscriptionHandler(request: FastifyRequest, reply: FastifyReply) {
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

export async function updateRateupPlanFeatureHandler(request: FastifyRequest, reply: FastifyReply) {
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

export async function updatePlanFeaturesHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    await updatePlanFeatures();
    reply.code(200).send("plans updated successfully");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateFreePlanExpiryHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    await updateFreePlanExpiry();
    reply.code(200).send("success");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function migrateFreePlanFeaturesHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { updated } = await migrateFreePlanFeatures();
    reply.code(200).send({
      message: "Free plan subscriptions updated to the latest feature set",
      updated,
    });
  } catch (e) {
    log.error(e);
    reply.code(500).send("Error migrating free plan features");
  }
}
export async function updateDefaultLifecycleHandler(request: FastifyRequest, reply: FastifyReply) {
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
      emoji: "✨",
      description:
        "A potential customer who has just entered the pipeline and shown initial interest.",
      isWon: false,
    },
    {
      name: "Cold Lead",
      ordering: 1,
      isDefault: false,
      category: StageCategory.lost,
      emoji: "❄️",
      description:
        "A lead that has gone cold, showing little or no engagement despite outreach attempts.",
      isWon: false,
    },
    {
      name: "Engaged Lead",
      ordering: 2,
      isDefault: false,
      category: StageCategory.active,
      emoji: "⚡",
      description: "The Contact is actively interested and ready to move forward.",
      isWon: false,
    },
    {
      name: "In Negotiation",
      ordering: 3,
      isDefault: false,
      category: StageCategory.active,
      emoji: "💵",
      description:
        "The lead is reviewing the proposal, and pricing or payment discussions are underway.",
      isWon: false,
    },
    {
      name: "Customer",
      ordering: 4,
      isDefault: false,
      category: StageCategory.won,
      emoji: "🤩",
      description: "The lead has successfully completed a purchase and become a paying customer.",
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

export async function migrateTagsHandle(req: FastifyRequest, res: FastifyReply) {
  try {
    const contactCustomFieldValueCount = await prisma.contactCustomFieldValue.count();

    if (contactCustomFieldValueCount > 0) {
      return res.code(400).send("Tags have already been migrated");
    }
    await migrateTags();
    res.code(200).send("Tags migrated successfully");
  } catch (error) {
    log.error(error);
    res.code(500).send("Error migrating tags");
  }
}

async function migrateTags() {
  // 1. Load all org account settings
  const settings = await prisma.waAccountSettings.findMany({
    include: { org: true },
  });

  for (const setting of settings) {
    // Create OrgCustomField rows from contactTags
    for (const tag of setting.contactTags) {
      // machine fieldId
      const fieldKey = tag.toLowerCase().replace(/\s+/g, "_");

      let field = await prisma.contactCustomField.findFirst({
        where: { orgId: setting.orgId, slug: fieldKey },
      });

      if (!field) {
        field = await prisma.contactCustomField.create({
          data: {
            orgId: setting.orgId,
            slug: fieldKey,
            name: tag,
            type: "text", // default; adjust later if you know real type
          },
        });
      }
    }

    // 2. Load contacts for this org
    const contacts = await prisma.contact.findMany({
      where: { orgId: setting.orgId },
    });

    for (const contact of contacts) {
      if (!contact.tags) continue;

      const tags = contact.tags as Record<string, any>;

      for (const [key, val] of Object.entries(tags)) {
        const fieldKey = key.toLowerCase().replace(/\s+/g, "_");

        // Find the ContactCustomField for this org + fieldId
        const field = await prisma.contactCustomField.findFirst({
          where: { orgId: setting.orgId, slug: fieldKey },
        });

        if (!field) {
          console.warn(`No ContactCustomField for ${key} in org ${setting.orgId}`);
          continue;
        }

        // Save ContactCustomFieldValue
        await prisma.contactCustomFieldValue.create({
          data: {
            contactId: contact.id,
            fieldId: field.id, // reference UUID
            value: val,
          },
        });
      }
    }
  }
}

export async function backfillWithSQLHandler(req: FastifyRequest, res: FastifyReply) {
  try {
    const fi = await prisma.contact.findFirst({
      where: {
        lastMessageWaCreatedAt: {
          not: null,
        },
      },
    });
    if (fi) return res.code(400).send("Backfill already done");

    await backfillWithSQL();
    res.code(200).send("Backfill completed successfully");
  } catch (error) {
    log.error(error);
    res.code(500).send("Error during backfill");
  }
}

export async function migrateWaTemplatePhoneIdsHandler(req: FastifyRequest, res: FastifyReply) {
  try {
    const result = await migrateWaTemplatePhoneIds();
    res.code(200).send({
      message: "WaTemplate whatsappSettingsPhoneId migration completed",
      ...result,
    });
  } catch (error) {
    log.error(error);
    res.code(500).send("Error migrating WaTemplate phone IDs");
  }
}

export async function migrateLoyaltyTierPriorityHandler(req: FastifyRequest, res: FastifyReply) {
  try {
    const programs = await prisma.loyaltyProgram.findMany({
      select: { id: true },
    });
    let totalUpdated = 0;

    for (const program of programs) {
      const tiers = await prisma.loyaltyTier.findMany({
        where: { programId: program.id },
        orderBy: { threshold: "asc" },
        select: { id: true },
      });

      for (let i = 0; i < tiers.length; i++) {
        await prisma.loyaltyTier.update({
          where: { id: tiers[i].id },
          data: { priority: i },
        });
        totalUpdated++;
      }
    }

    res.code(200).send({
      message: "Loyalty tier priorities migrated successfully",
      totalUpdated,
    });
  } catch (error) {
    log.error(error);
    res.code(500).send("Error migrating loyalty tier priorities");
  }
}

export async function syncTeamFeaturesHandler(
  req: FastifyRequest<{ Querystring: { orgId?: string } }>,
  res: FastifyReply,
) {
  try {
    const { orgId } = req.query;
    const results = await syncTeamFeaturesFromSubscription(orgId);
    res.code(200).send({
      message: "Team features synced from subscription",
      orgsProcessed: results.length,
      results,
    });
  } catch (error) {
    log.error(error);
    res.code(500).send("Error syncing team features");
  }
}

export async function seedInboxStatsAutomationHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const result = await seedInboxStatsAutomation();
    reply
      .code(200)
      .send(
        `Seeded inbox stats successfully. Seeded ${result.seeded} out of ${result.total} orgs.`,
      );
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

// Dry run by default; pass ?apply=true to create the conversations.
export async function backfillConversationsHandler(
  request: FastifyRequest<{ Querystring: { apply?: string } }>,
  reply: FastifyReply,
) {
  try {
    const apply = request.query.apply === "true";
    const result = await backfillConversationsFromMessages(apply);
    const summary =
      `${result.conversationsCreated} missing conversation(s) created, ` +
      `${result.messagesLinked} message(s) linked, ${result.assigneesBackfilled} assignee(s) copied`;
    reply.code(200).send({
      message: apply
        ? result.done
          ? `Backfill complete: ${summary}.`
          : `Backfill batch done (${summary}). More work remains — run again to continue.`
        : `Dry run: ${summary} would be written. Re-run with ?apply=true to write.`,
      ...result,
    });
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

// Dry run by default; pass ?apply=true to re-segment. Resumable: pass the
// returned nextCursor back as ?cursor= to continue where the last batch ended.
export async function backfillConversationSessionsHandler(
  request: FastifyRequest<{ Querystring: { apply?: string; cursor?: string } }>,
  reply: FastifyReply,
) {
  try {
    const apply = request.query.apply === "true";
    const result = await backfillConversationSessions(apply, request.query.cursor);
    const summary =
      `${result.scannedContacts} contact(s) scanned: ` +
      `${result.conversationsCreated} session(s) created, ${result.conversationsReused} reused, ` +
      `${result.conversationsDeleted} empty row(s) deleted, ${result.messagesRelinked} message(s) relinked`;
    reply.code(200).send({
      message: apply
        ? result.done
          ? `Session backfill complete: ${summary}.`
          : `Session backfill batch done (${summary}). Re-run with ?cursor=${result.nextCursor} to continue.`
        : `Dry run (first batch): ${summary} would be written. Re-run with ?apply=true to write.`,
      ...result,
    });
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

// Dry run by default; pass ?apply=true to write the repairs.
export async function reconcileInboxStatusHandler(
  request: FastifyRequest<{ Querystring: { apply?: string } }>,
  reply: FastifyReply,
) {
  try {
    const apply = request.query.apply === "true";
    const result = await reconcileInboxStatus(apply);
    reply.code(200).send({
      message: apply
        ? `Reconciled ${result.repaired} conversation(s).`
        : `Dry run: ${result.mismatched} conversation(s) would be reconciled. Re-run with ?apply=true to write.`,
      ...result,
    });
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
