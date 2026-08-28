import { TemplateType } from "../../../../generated/prisma/client.js";
import {
  LoyaltyEventType,
  WaAutomatedReplyResponseType,
  WaTemplateCategory,
  WaTemplateComponentTypeUpperCase,
} from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { getAutomatedRepliesByKeyWeords } from "../../whatsapp/automatedReply/wa_automatedReply.service.js";
import {
  createTemplate,
  saveTemplate,
} from "../../whatsapp/messageTemplates/wa_templates.service.js";
import type {
  BasicsStepInput,
  EarningStepInput,
  EventTemplateResult,
  MessagesStepInput,
  RewardsStepInput,
  SkippedCommand,
  TiersStepInput,
} from "./onboarding.schema.js";
import {
  LOYALTY_PRESETS,
  PRESET_REWARD_STATUS,
  suggestPresetKey,
  type LoyaltyPresetKey,
} from "./presets.js";

/**
 * The guided loyalty setup wizard.
 *
 * Each step commits to the real tables straight away while the programme stays at
 * status "draft" — both `loyaltyWaDispatcher` and the inbound command handler gate on
 * status === "active", so a half-built programme is silent to customers. That is what
 * makes the wizard resumable without a staging area.
 *
 * Every step is idempotent: re-running one must converge on the same rows, never
 * duplicate them. Users navigate backwards, and a failed request gets retried.
 */

const DRAFT = "draft";
const ACTIVE = "active";

/* ── reading ────────────────────────────────────────────────────────────────── */

export async function getOnboardingPresets(orgId: string) {
  const org = await prisma.org.findUnique({
    where: { id: orgId },
    select: { onboarding: true },
  });

  // `industry` is free text inside the `Org.onboarding` JSON blob written by the signup
  // wizard, not a column — so it is often missing or unrecognised. It only ever picks a
  // default the user can change.
  const onboarding = org?.onboarding as { industry?: unknown } | null;

  return {
    presets: Object.values(LOYALTY_PRESETS),
    suggestedPresetKey: suggestPresetKey(onboarding?.industry),
  };
}

export async function getOnboardingState(orgId: string) {
  const program = await prisma.loyaltyProgram.findUnique({
    where: { orgId },
    include: { tiers: { orderBy: { threshold: "asc" } } },
  });

  if (!program) {
    return {
      program: null,
      presetKey: null,
      lastCompletedStep: null,
      saved: { tiers: [], rules: [], rewards: [], commands: [], triggers: [] },
      counts: { tiers: 0, rules: 0, rewards: 0, commands: 0, triggers: 0 },
    };
  }

  // The saved rows come back, not just their counts: the wizard prefills each step from
  // what is already stored and only falls back to the preset for steps never saved.
  // Without this, stepping back to an earlier step would redisplay preset values and
  // saving would overwrite the user's edits.
  const [rules, rewards, commands, triggers] = await Promise.all([
    prisma.loyaltyEarningRule.findMany({
      where: { programId: program.id },
      orderBy: { priority: "desc" },
    }),
    prisma.loyaltyReward.findMany({
      where: { programId: program.id },
      orderBy: { pointsCost: "asc" },
    }),
    prisma.loyaltyWaCommand.findMany({ where: { orgId } }),
    prisma.loyaltyEventTrigger.findMany({ where: { programId: program.id } }),
  ]);

  return {
    program,
    presetKey: program.onboardingPresetKey,
    lastCompletedStep: program.onboardingStep,
    saved: {
      tiers: program.tiers,
      rules,
      rewards,
      commands,
      triggers,
    },
    counts: {
      tiers: program.tiers.length,
      rules: rules.length,
      rewards: rewards.length,
      commands: commands.length,
      triggers: triggers.length,
    },
  };
}

/* ── shared helpers ─────────────────────────────────────────────────────────── */

async function requireProgram(orgId: string) {
  const program = await prisma.loyaltyProgram.findUnique({ where: { orgId } });
  if (!program) {
    throw new OnboardingError("Start with the basics step before this one", 409);
  }
  return program;
}

/** A step failure the user can act on, as opposed to an unexpected 500. */
export class OnboardingError extends Error {
  readonly statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "OnboardingError";
    this.statusCode = statusCode;
  }
}

/* ── step: basics ───────────────────────────────────────────────────────────── */

export async function applyBasicsStep(orgId: string, input: BasicsStepInput) {
  const existing = await prisma.loyaltyProgram.findUnique({ where: { orgId } });

  const shared = {
    name: input.name,
    currencyName: input.currencyName,
    currencyCode: input.currencyCode,
    currencySymbol: input.currencySymbol,
    defaultCountryCode: input.defaultCountryCode,
    whatsappSettingsId: input.whatsappSettingsId,
    signupBonus: input.signupBonus,
    referralBonus: input.referralBonus,
    refereeBonus: input.refereeBonus,
    onboardingPresetKey: input.presetKey,
    onboardingStep: "basics",
  };

  if (!existing) {
    return await prisma.loyaltyProgram.create({
      data: { orgId, status: DRAFT, ...shared },
    });
  }

  // Re-running basics on a live programme must not take it off the air, so `status` is
  // deliberately absent from the update — only `activate` and the settings page move it.
  return await prisma.loyaltyProgram.update({
    where: { id: existing.id },
    data: shared,
  });
}

/* ── step: earning ──────────────────────────────────────────────────────────── */

export async function applyEarningStep(orgId: string, input: EarningStepInput) {
  const program = await requireProgram(orgId);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.loyaltyEarningRule.findMany({
      where: { programId: program.id },
      select: { id: true, name: true },
    });
    const byName = new Map(existing.map((r) => [r.name.trim().toLowerCase(), r.id]));

    for (const rule of input.rules) {
      const data = {
        name: rule.name,
        description: rule.description ?? null,
        status: ACTIVE,
        pointsPerUnit: rule.pointsPerUnit,
        multiplier: rule.multiplier,
        bonusPoints: rule.bonusPoints,
        allowedDays: rule.allowedDays,
        applicableToTiers: [],
        minPurchaseAmount: rule.minPurchaseAmount ?? null,
        isDefault: rule.isDefault,
        priority: rule.priority,
      };

      // There is no unique constraint on [programId, name], so matching by name is what
      // keeps a re-run from stacking up duplicate rules.
      const id = byName.get(rule.name.trim().toLowerCase());
      if (id) {
        await tx.loyaltyEarningRule.update({ where: { id }, data });
      } else {
        await tx.loyaltyEarningRule.create({ data: { ...data, programId: program.id } });
      }
    }

    await tx.loyaltyProgram.update({
      where: { id: program.id },
      data: { onboardingStep: "earning" },
    });
  });

  return await prisma.loyaltyEarningRule.findMany({
    where: { programId: program.id },
    orderBy: { priority: "desc" },
  });
}

/* ── step: tiers ────────────────────────────────────────────────────────────── */

export async function applyTiersStep(orgId: string, input: TiersStepInput) {
  const program = await requireProgram(orgId);

  await prisma.$transaction(async (tx) => {
    await tx.loyaltyProgram.update({
      where: { id: program.id },
      data: { tiersEnabled: input.tiersEnabled, onboardingStep: "tiers" },
    });

    if (!input.tiersEnabled) return;

    const existing = await tx.loyaltyTier.findMany({
      where: { programId: program.id },
      select: { id: true, name: true },
    });
    const byName = new Map(existing.map((t) => [t.name.trim().toLowerCase(), t.id]));

    // `LoyaltyTier` is unique on both name and threshold within a programme. The payload
    // has already been checked for internal collisions; this clears any *existing* tier
    // whose threshold one of the incoming tiers is about to claim, which the name-based
    // match alone would miss (e.g. renaming "Silver" at 1000 to "Local" at 1000).
    await tx.loyaltyTier.deleteMany({
      where: {
        programId: program.id,
        threshold: { in: input.tiers.map((t) => t.threshold) },
        name: { notIn: input.tiers.map((t) => t.name) },
      },
    });

    for (const [index, tier] of input.tiers.entries()) {
      const data = {
        name: tier.name,
        threshold: tier.threshold,
        pointsMultiplier: tier.pointsMultiplier,
        color: tier.color,
        benefitsDescription: tier.benefitsDescription ?? null,
        priority: index + 1,
      };

      const id = byName.get(tier.name.trim().toLowerCase());
      if (id) {
        await tx.loyaltyTier.update({ where: { id }, data });
      } else {
        await tx.loyaltyTier.create({ data: { ...data, programId: program.id } });
      }
    }
  });

  return await prisma.loyaltyTier.findMany({
    where: { programId: program.id },
    orderBy: { threshold: "asc" },
  });
}

/* ── step: rewards ──────────────────────────────────────────────────────────── */

export async function applyRewardsStep(orgId: string, input: RewardsStepInput) {
  const program = await requireProgram(orgId);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.loyaltyReward.findMany({
      where: { programId: program.id },
      select: { id: true, name: true },
    });
    const byName = new Map(existing.map((r) => [r.name.trim().toLowerCase(), r.id]));

    for (const reward of input.rewards) {
      const data = {
        name: reward.name,
        description: reward.description ?? null,
        // Uppercase deliberately: `getActiveLoyaltyRewards` and the `rewards` include on
        // `getLoyaltyProgramByOrg` both filter on "ACTIVE". A lowercase status writes a
        // reward that exists but is invisible everywhere it matters.
        status: PRESET_REWARD_STATUS,
        pointsCost: reward.pointsCost,
        rewardType: reward.rewardType,
        rewardValue: reward.rewardValue,
        stockQuantity: reward.stockQuantity ?? null,
        availableForTiers: [],
        redemptionRules: {},
      };

      const id = byName.get(reward.name.trim().toLowerCase());
      if (id) {
        const { redemptionRules: _skip, ...updatable } = data;
        await tx.loyaltyReward.update({ where: { id }, data: updatable });
      } else {
        await tx.loyaltyReward.create({ data: { ...data, programId: program.id } });
      }
    }

    await tx.loyaltyProgram.update({
      where: { id: program.id },
      data: { onboardingStep: "rewards" },
    });
  });

  return await prisma.loyaltyReward.findMany({
    where: { programId: program.id },
    orderBy: { pointsCost: "asc" },
  });
}

/* ── step: messages ─────────────────────────────────────────────────────────── */

/**
 * Wraps preset copy in the rich-text document `LoyaltyWaCommand.content` holds
 * (`PRichTextContent` — a single node, not an array). `richTextToPlainText` unwraps the
 * document's `content` and joins one line per top-level block on the way out.
 */
function toRichText(text: string): RichTextNode {
  return {
    type: "doc",
    content: text.split("\n").map((line) => ({
      type: "paragraph",
      content: line.length > 0 ? [{ type: "text", text: line }] : [],
    })),
  };
}

export async function applyMessagesStep(orgId: string, input: MessagesStepInput) {
  const program = await requireProgram(orgId);

  const skipped: SkippedCommand[] = [];

  /* Inbound keyword replies — plain text, so they work the moment the programme goes
     live. Nothing here touches Meta. */
  for (const command of input.commands) {
    const keyword = command.requestMessage.trim();

    // Keywords are shared with WhatsApp automated replies, which own the same inbox.
    // A collision is one bad keyword, not a bad step, so it is reported and skipped
    // rather than aborting everything the user just configured.
    const clashesWithAutomation = await getAutomatedRepliesByKeyWeords(orgId, keyword);
    if (clashesWithAutomation) {
      skipped.push({ requestMessage: keyword, reason: "keyword_taken_by_automation" });
      continue;
    }

    const existing = await prisma.loyaltyWaCommand.findFirst({
      where: { orgId, requestMessage: { equals: keyword, mode: "insensitive" } },
    });

    // @@unique([requestMessage, orgId]) — an existing row for a *different* command type
    // is someone else's keyword; only update the row that is already ours.
    if (existing && existing.type !== command.type) {
      skipped.push({ requestMessage: keyword, reason: "keyword_taken_by_command" });
      continue;
    }

    const data = {
      type: command.type,
      requestMessage: keyword,
      content: toRichText(command.text),
      responseType: WaAutomatedReplyResponseType.Text,
      waTemplateId: null,
    };

    if (existing) {
      await prisma.loyaltyWaCommand.update({ where: { id: existing.id }, data });
    } else {
      await prisma.loyaltyWaCommand.create({ data: { ...data, orgId } });
    }
  }

  /* Outbound notifications — real Meta templates, which need approval before they can
     send. These are network calls, so they run outside any transaction and each one
     reports its own outcome; the wizard shows "pending" and moves on. */
  const eventTemplates: EventTemplateResult[] = [];

  for (const template of input.eventTemplates) {
    try {
      const created = await submitEventTemplate(orgId, program.id, template);
      eventTemplates.push(created);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      log.error(
        { err: error, orgId, eventType: template.eventType },
        "Loyalty preset template failed",
      );
      eventTemplates.push({
        eventType: template.eventType,
        templateName: template.templateName,
        status: "failed",
        error: message,
      });
    }
  }

  await prisma.loyaltyProgram.update({
    where: { id: program.id },
    data: {
      onboardingStep: "messages",
      ...(input.referralMessageTemplate === undefined
        ? {}
        : { referralMessageTemplate: input.referralMessageTemplate as object }),
    },
  });

  return { skipped, eventTemplates };
}

async function submitEventTemplate(
  orgId: string,
  programId: string,
  template: { eventType: LoyaltyEventType; templateName: string; body: string },
): Promise<EventTemplateResult> {
  const placeholderCount = countPlaceholders(template.body);

  const metaTemplate: WaMetaTemplate = {
    name: template.templateName,
    language: "en",
    category: WaTemplateCategory.UTILITY,
    components: [
      {
        type: WaTemplateComponentTypeUpperCase.BODY,
        text: template.body,
        // Meta rejects a body with variables unless it is given a sample for each one.
        ...(placeholderCount > 0
          ? {
              example: {
                body_text: [Array.from({ length: placeholderCount }, (_, i) => `Sample ${i + 1}`)],
              },
            }
          : {}),
      },
    ],
  };

  const submitted = await createTemplate(orgId, metaTemplate);
  const saved = await saveTemplate(submitted, orgId, {}, TemplateType.LOYALTY);

  // `LoyaltyEventTrigger` has no @@unique([programId, eventType]), so a re-run would
  // otherwise leave two enabled triggers racing for the same event.
  const existingTrigger = await prisma.loyaltyEventTrigger.findFirst({
    where: { programId, eventType: template.eventType },
  });

  if (existingTrigger) {
    await prisma.loyaltyEventTrigger.update({
      where: { id: existingTrigger.id },
      data: { waTemplateId: saved.id, enabled: true },
    });
  } else {
    await prisma.loyaltyEventTrigger.create({
      data: {
        programId,
        eventType: template.eventType,
        enabled: true,
        waTemplateId: saved.id,
      },
    });
  }

  return {
    eventType: template.eventType,
    templateName: template.templateName,
    status: "pending",
  };
}

function countPlaceholders(body: string): number {
  const matches = body.match(/\{\{(\d+)\}\}/g);
  if (!matches) return 0;
  return new Set(matches).size;
}

/* ── activate ───────────────────────────────────────────────────────────────── */

export async function activateProgram(orgId: string) {
  const program = await requireProgram(orgId);

  // Hard guard: without a default earning rule the engine awards nothing, so an
  // "active" programme would silently do nothing at all.
  const defaultRule = await prisma.loyaltyEarningRule.findFirst({
    where: { programId: program.id, isDefault: true, status: ACTIVE },
    select: { id: true },
  });

  if (!defaultRule) {
    throw new OnboardingError(
      "Add a default earning rule before activating — without one, customers earn nothing",
      409,
    );
  }

  // Soft gaps: worth telling the user about, not worth blocking a launch over.
  const [rewardCount, waSettingsCount] = await Promise.all([
    prisma.loyaltyReward.count({ where: { programId: program.id, status: PRESET_REWARD_STATUS } }),
    prisma.whatsappSettings.count({ where: { orgId } }),
  ]);

  const warnings: string[] = [];
  if (rewardCount === 0) {
    warnings.push("No rewards yet — customers can earn points but have nothing to redeem.");
  }
  if (waSettingsCount === 0) {
    warnings.push("No WhatsApp channel connected — loyalty messages cannot be delivered.");
  }

  const activated = await prisma.loyaltyProgram.update({
    where: { id: program.id },
    data: { status: ACTIVE, onboardingCompletedAt: new Date() },
  });

  return { program: activated, warnings };
}

export type { LoyaltyPresetKey };
