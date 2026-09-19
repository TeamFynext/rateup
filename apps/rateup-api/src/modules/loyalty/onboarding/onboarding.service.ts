import { TemplateType } from "../../../../generated/prisma/client.js";
import {
  LoyaltyEventType,
  LoyaltyTemplateTypes,
  WaAutomatedReplyResponseType,
  WaTemplateCategory,
  WaTemplateComponentTypeUpperCase,
} from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import type { WaTemplateButton } from "../../../types/whatsapp.types.js";
import { LoyaltyRewardType } from "../../../types/loyalty.js";
import { calculateGiveback, givebackBand } from "../giveback.js";
import { buildGivebackInput, loadProgramGivebackSources } from "../giveback/giveback.service.js";
import { joinButtonLabel } from "../loyaltyEventTemplates.js";
import { toRichText } from "../richText.js";
import {
  reevaluateProgramTiers,
  type ProgramTierMoves,
} from "../tiers/tierReevaluation.service.js";
import { getAutomatedRepliesByKeyWeords } from "../../whatsapp/automatedReply/wa_automatedReply.service.js";
import {
  createTemplate,
  getTemplateByNameAndOrgId,
  saveTemplate,
} from "../../whatsapp/messageTemplates/wa_templates.service.js";
import type {
  EarningStepInput,
  EventTemplateResult,
  MessagesStepInput,
  ProfileStepInput,
  RewardsStepInput,
  SkippedCommand,
  TiersStepInput,
} from "./onboarding.schema.js";
import {
  LOYALTY_PRESETS,
  PRESET_REWARD_STATUS,
  RETIRED_REWARD_STATUS,
  suggestPresetKey,
  type LoyaltyPresetKey,
} from "./presets.js";

/**
 * The guided loyalty setup wizard.
 *
 * Each step commits to the real tables straight away while the programme stays at
 * status "draft" — both `sendLoyaltyEvent` and the inbound command handler gate on
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
      counts: {
        tiers: 0,
        rules: 0,
        rewards: 0,
        commands: 0,
        triggers: 0,
        members: 0,
        pendingApprovals: 0,
        templatesPending: 0,
      },
    };
  }

  // The saved rows come back, not just their counts: the wizard prefills each step from
  // what is already stored and only falls back to the preset for steps never saved.
  // Without this, stepping back to an earlier step would redisplay preset values and
  // saving would overwrite the user's edits.
  // The three trailing counts feed the sidebar badges, so the nav needs this one request
  // and nothing else.
  const [rules, rewards, commands, triggers, members, pendingApprovals, templatesPending] =
    await Promise.all([
      prisma.loyaltyEarningRule.findMany({
        where: { programId: program.id },
        orderBy: { priority: "desc" },
      }),
      // Review rewards belong to Feedback, not the wizard's Rewards step: shown there they
      // would be misread as point rewards and re-saved as such.
      prisma.loyaltyReward.findMany({
        where: { programId: program.id, rewardType: { not: LoyaltyRewardType.REVIEW } },
        orderBy: { pointsCost: "asc" },
      }),
      prisma.loyaltyWaCommand.findMany({ where: { orgId } }),
      prisma.loyaltyEventTrigger.findMany({
        where: { programId: program.id },
        include: { waTemplate: { select: { id: true, data: true } } },
      }),
      prisma.customerLoyaltyAccount.count({ where: { programId: program.id } }),
      prisma.approvalRequest.count({
        where: { status: "PENDING", account: { programId: program.id } },
      }),
      prisma.waTemplate.count({
        where: {
          orgId,
          templateType: TemplateType.LOYALTY,
          data: { path: ["status"], equals: "PENDING" },
        },
      }),
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
      triggers: triggers.map(({ waTemplate, ...trigger }) => {
        const data = waTemplate?.data as { name?: string; status?: string } | null | undefined;
        return {
          ...trigger,
          templateName: data?.name ?? null,
          templateStatus: data?.status ?? null,
        };
      }),
    },
    counts: {
      tiers: program.tiers.length,
      rules: rules.length,
      rewards: rewards.length,
      commands: commands.length,
      triggers: triggers.length,
      members,
      pendingApprovals,
      templatesPending,
    },
  };
}

/* ── shared helpers ─────────────────────────────────────────────────────────── */

async function requireProgram(orgId: string) {
  const program = await prisma.loyaltyProgram.findUnique({ where: { orgId } });
  if (!program) {
    throw new OnboardingError("Start with the profile step before this one", 409);
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

/* ── step: profile ──────────────────────────────────────────────────────────── */

/**
 * The join and referral bonuses, as a Prisma update fragment.
 *
 * They are edited on the rewards step but stored on `LoyaltyProgram`, and both steps may
 * send them. Only the ones actually present are written, so a step that says nothing about
 * a bonus never resets it.
 */
function bonusFieldsOf(input: {
  signupBonus?: number;
  referralBonus?: number;
  refereeBonus?: number;
}) {
  return {
    ...(input.signupBonus === undefined ? {} : { signupBonus: input.signupBonus }),
    ...(input.referralBonus === undefined ? {} : { referralBonus: input.referralBonus }),
    ...(input.refereeBonus === undefined ? {} : { refereeBonus: input.refereeBonus }),
  };
}

/**
 * The venue & branding fields, as a Prisma update fragment. `undefined` is dropped so a
 * payload that does not mention a field leaves it alone; `null` goes through and clears it.
 */
function profileFieldsOf(input: ProfileStepInput) {
  const fields = {
    businessName: input.businessName,
    timezone: input.timezone,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    contactEmail: input.contactEmail,
    logoUrl: input.logoUrl,
    brandColor: input.brandColor,
    heroImageUrl: input.heroImageUrl,
  };
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}

export async function applyProfileStep(orgId: string, input: ProfileStepInput) {
  const existing = await prisma.loyaltyProgram.findUnique({ where: { orgId } });

  const shared = {
    name: input.name,
    currencyName: input.currencyName,
    currencyCode: input.currencyCode,
    currencySymbol: input.currencySymbol,
    defaultCountryCode: input.defaultCountryCode,
    whatsappSettingsId: input.whatsappSettingsId,
    averageOrderValue: input.averageOrderValue,
    onboardingStep: "profile",
    // The bonuses belong to the rewards step now. A payload that still carries them is
    // honoured; one that does not must leave the stored values where they are.
    ...bonusFieldsOf(input),
    ...profileFieldsOf(input),
    // An explicit preset always wins; when absent, an existing programme keeps the one it
    // was seeded from (the later steps' defaults must not change under the user).
    ...(input.presetKey === undefined ? {} : { onboardingPresetKey: input.presetKey }),
  };

  if (!existing) {
    // The wizard no longer asks what kind of business this is, so the starter pack is
    // read off the org's industry — the same guess `GET /presets` makes.
    const presetKey = input.presetKey ?? (await getOnboardingPresets(orgId)).suggestedPresetKey;
    return await prisma.loyaltyProgram.create({
      // A brand-new programme has nothing stored to preserve, so absent means zero here.
      data: {
        signupBonus: 0,
        referralBonus: 0,
        refereeBonus: 0,
        orgId,
        status: DRAFT,
        ...shared,
        // The points name is asked on the earning step; until then the pack's name stands.
        currencyName: input.currencyName ?? LOYALTY_PRESETS[presetKey].basics.currencyName,
        onboardingPresetKey: presetKey,
      },
    });
  }

  // Re-running the profile on a live programme must not take it off the air, so `status`
  // is deliberately absent from the update — only `activate` and the settings page move it.
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
    const existingIds = new Set(existing.map((r) => r.id));
    const byName = new Map(existing.map((r) => [r.name.trim().toLowerCase(), r.id]));
    const keptIds = new Set<string>();

    for (const rule of input.rules) {
      const data = {
        name: rule.name,
        description: rule.description ?? null,
        // The default rule can never be switched off — without it nothing earns.
        status: rule.isDefault ? ACTIVE : (rule.status ?? ACTIVE),
        pointsPerUnit: rule.pointsPerUnit,
        // The default rule is the base rate itself; a multiplier on it is the rate in disguise.
        multiplier: rule.isDefault ? 1 : rule.multiplier,
        bonusPoints: rule.bonusPoints,
        allowedDays: rule.allowedDays,
        minPurchaseAmount: rule.minPurchaseAmount ?? null,
        isDefault: rule.isDefault,
        priority: rule.priority,
        // A tier restriction the payload does not mention is left as stored: the Program
        // editor only shows it under Advanced, and a save must not silently clear it.
        ...(rule.applicableToTiers === undefined
          ? {}
          : { applicableToTiers: rule.applicableToTiers }),
      };

      // Prefer the id the client round-tripped, so a rename updates the same row. There
      // is no unique constraint on [programId, name], so matching by name is what keeps
      // an older client's re-run from stacking up duplicate rules.
      const id =
        rule.id && existingIds.has(rule.id) ? rule.id : byName.get(rule.name.trim().toLowerCase());
      if (id) {
        await tx.loyaltyEarningRule.update({ where: { id }, data });
        keptIds.add(id);
      } else {
        const created = await tx.loyaltyEarningRule.create({
          data: { ...data, applicableToTiers: rule.applicableToTiers ?? [], programId: program.id },
        });
        keptIds.add(created.id);
      }
    }

    if (input.deleteMissing) {
      const removedIds = existing.map((r) => r.id).filter((id) => !keptIds.has(id));
      if (removedIds.length > 0) {
        // A rule that has priced a transaction is referenced from the ledger (no cascade),
        // so it is switched off rather than deleted; the rest simply go.
        const used = await tx.loyaltyTransaction.findMany({
          where: { earningRuleId: { in: removedIds } },
          select: { earningRuleId: true },
          distinct: ["earningRuleId"],
        });
        const inUse = new Set(
          used.map((t) => t.earningRuleId).filter((id): id is string => id !== null),
        );
        const deletable = removedIds.filter((id) => !inUse.has(id));

        if (inUse.size > 0) {
          await tx.loyaltyEarningRule.updateMany({
            where: { id: { in: [...inUse] } },
            data: { status: "inactive" },
          });
        }
        if (deletable.length > 0) {
          await tx.loyaltyEarningRule.deleteMany({ where: { id: { in: deletable } } });
        }
      }
    }

    await tx.loyaltyProgram.update({
      where: { id: program.id },
      data: {
        onboardingStep: "earning",
        ...(input.averageOrderValue === undefined
          ? {}
          : { averageOrderValue: input.averageOrderValue }),
        ...(input.currencyName === undefined ? {} : { currencyName: input.currencyName }),
      },
    });
  });

  return await prisma.loyaltyEarningRule.findMany({
    where: { programId: program.id },
    orderBy: { priority: "desc" },
  });
}

/* ── step: tiers ────────────────────────────────────────────────────────────── */

type TierInput = TiersStepInput["tiers"][number];

/** Where everyone starts. Injected when the payload only describes the tiers above it. */
export const BASE_TIER: TierInput = {
  name: "Member",
  threshold: 0,
  pointsMultiplier: 1,
  color: "#5a8cc6",
  benefitsDescription: null,
};

/**
 * A ladder needs a rung at 0: signup places a new member in the lowest-threshold tier and a
 * reward with no tier restriction means "everyone". The wizard sends only the VIP tier it
 * asked about, so the base row is added here — never replacing one the payload names.
 */
export function ensureBaseTier(tiers: TierInput[]): TierInput[] {
  if (tiers.some((tier) => tier.threshold === 0)) return tiers;
  return [BASE_TIER, ...tiers];
}

export async function applyTiersStep(orgId: string, input: TiersStepInput) {
  const program = await requireProgram(orgId);

  await prisma.$transaction(async (tx) => {
    await tx.loyaltyProgram.update({
      where: { id: program.id },
      data: {
        tiersEnabled: input.tiersEnabled,
        onboardingStep: "tiers",
        ...(input.qualificationWindowMonths === undefined
          ? {}
          : { tierQualificationWindowMonths: input.qualificationWindowMonths }),
      },
    });

    // Turning tiers off must never delete data — the ladder is still there to switch on.
    if (!input.tiersEnabled) return;

    const existing = await tx.loyaltyTier.findMany({
      where: { programId: program.id },
      select: { id: true, name: true, threshold: true },
    });
    const existingIds = new Set(existing.map((t) => t.id));
    const byName = new Map(existing.map((t) => [t.name.trim().toLowerCase(), t.id]));
    const byThreshold = new Map(existing.map((t) => [Number(t.threshold), t.id]));
    const keptIds = new Set<string>();

    const tiers = ensureBaseTier(input.tiers);
    const incomingNames = new Set(tiers.map((t) => t.name.trim().toLowerCase()));

    for (const [index, tier] of tiers.entries()) {
      const data = {
        name: tier.name,
        threshold: tier.threshold,
        pointsMultiplier: tier.pointsMultiplier,
        color: tier.color,
        benefitsDescription: tier.benefitsDescription ?? null,
        priority: index + 1,
      };

      // `LoyaltyTier` is unique on both name and threshold within a programme. Match by
      // id, then name, then threshold: a tier renamed onto an occupied threshold ("Bronze"
      // at 0 becoming "Member" at 0) is an update of that row, so its members keep their
      // tier — deleting and recreating would have set their `currentTierId` to null.
      const byThresholdId = byThreshold.get(tier.threshold);
      const thresholdOwner = existing.find((t) => t.id === byThresholdId);
      const thresholdFree =
        thresholdOwner !== undefined &&
        !keptIds.has(thresholdOwner.id) &&
        !incomingNames.has(thresholdOwner.name.trim().toLowerCase());
      const id =
        tier.id && existingIds.has(tier.id)
          ? tier.id
          : (byName.get(tier.name.trim().toLowerCase()) ??
            (thresholdFree ? byThresholdId : undefined));
      if (id) {
        await tx.loyaltyTier.update({ where: { id }, data });
        keptIds.add(id);
      } else {
        const created = await tx.loyaltyTier.create({ data: { ...data, programId: program.id } });
        keptIds.add(created.id);
      }
    }

    if (input.deleteMissing) {
      const removed = existing.filter((t) => !keptIds.has(t.id));
      for (const tier of removed) {
        const members = await tx.customerLoyaltyAccount.count({
          where: { currentTierId: tier.id },
        });
        if (members > 0) {
          if (!input.downgradeCustomers) {
            throw new OnboardingError(
              `${members} members sit in ${tier.name}. Confirm the downgrade before removing it.`,
              409,
            );
          }
          // Move them to the nearest surviving tier below; if none is lower, the lowest
          // survivor. Worked out from the payload's thresholds rather than `priority`,
          // which this step has just rewritten.
          const survivors = await tx.loyaltyTier.findMany({
            where: { programId: program.id, id: { in: [...keptIds] } },
            select: { id: true, threshold: true },
            orderBy: { threshold: "asc" },
          });
          const gone = await tx.loyaltyTier.findUnique({
            where: { id: tier.id },
            select: { threshold: true },
          });
          const below = survivors.filter(
            (t) => gone !== null && Number(t.threshold) < Number(gone.threshold),
          );
          const target = below.at(-1) ?? survivors[0];
          if (target) {
            await tx.customerLoyaltyAccount.updateMany({
              where: { currentTierId: tier.id },
              data: { currentTierId: target.id },
            });
          }
        }
        await tx.loyaltyTier.deleteMany({ where: { id: tier.id } });
      }
    }
  });

  const tiers = await prisma.loyaltyTier.findMany({
    where: { programId: program.id },
    orderBy: { threshold: "asc" },
  });

  // The ladder is different now, so where each member stands may be too: a raised
  // threshold demotes, a lowered one or a new rung in the middle promotes. Settle it here
  // rather than leaving it to the next purchase or the nightly sweep, so the merchant sees
  // the effect of the change they just made.
  let moves: ProgramTierMoves = { evaluated: 0, promoted: 0, demoted: 0 };
  if (input.tiersEnabled && tiers.length > 0) {
    const windowMonths =
      input.qualificationWindowMonths === undefined
        ? program.tierQualificationWindowMonths
        : input.qualificationWindowMonths;
    moves = await reevaluateProgramTiers({
      id: program.id,
      orgId,
      windowMonths,
      tiers: [...tiers].reverse(),
    });
  }

  return { tiers, moves };
}

/* ── step: rewards ──────────────────────────────────────────────────────────── */

export async function applyRewardsStep(orgId: string, input: RewardsStepInput) {
  const program = await requireProgram(orgId);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.loyaltyReward.findMany({
      where: { programId: program.id },
      select: { id: true, name: true },
    });
    const existingIds = new Set(existing.map((r) => r.id));
    const byName = new Map(existing.map((r) => [r.name.trim().toLowerCase(), r.id]));

    /** Rows the payload still accounts for. Anything else on the programme has been removed. */
    const keptIds = new Set<string>();

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
      };
      // Stock and tier restriction are only written when the payload speaks to them. The
      // Program editor reuses this step on live rewards, and a save that reset both to
      // "unlimited, everyone" would quietly undo the merchant's settings.
      const optional = {
        ...(reward.stockQuantity === undefined ? {} : { stockQuantity: reward.stockQuantity }),
        ...(reward.availableForTiers === undefined
          ? {}
          : { availableForTiers: reward.availableForTiers }),
      };

      // Prefer the id the client round-tripped. Falling back to the name keeps older
      // clients — and the preset rows, which have no id yet — working.
      const id =
        reward.id && existingIds.has(reward.id)
          ? reward.id
          : byName.get(reward.name.trim().toLowerCase());

      if (id) {
        // `redemptionRules` is deliberately never touched here; the full editor owns it.
        await tx.loyaltyReward.update({ where: { id }, data: { ...data, ...optional } });
        keptIds.add(id);
      } else {
        const created = await tx.loyaltyReward.create({
          data: {
            ...data,
            stockQuantity: reward.stockQuantity ?? null,
            availableForTiers: reward.availableForTiers ?? [],
            redemptionRules: {},
            programId: program.id,
          },
        });
        keptIds.add(created.id);
      }
    }

    // Removing a row in the wizard used to do nothing at all: the reward stayed ACTIVE and
    // reappeared on the next visit, because the step prefills from what is stored.
    const removedIds = existing.map((r) => r.id).filter((id) => !keptIds.has(id));

    if (removedIds.length > 0) {
      // A reward someone already redeemed or is holding cannot simply vanish —
      // `LoyaltyRedemption.reward` has no cascade, so the delete would fail, and a customer
      // holding it would be left pointing at nothing. Retire those instead.
      const [redeemed, issued] = await Promise.all([
        tx.loyaltyRedemption.findMany({
          where: { rewardId: { in: removedIds } },
          select: { rewardId: true },
          distinct: ["rewardId"],
        }),
        tx.customerReward.findMany({
          where: { rewardId: { in: removedIds } },
          select: { rewardId: true },
          distinct: ["rewardId"],
        }),
      ]);

      const inUse = new Set([...redeemed.map((r) => r.rewardId), ...issued.map((r) => r.rewardId)]);
      const deletable = removedIds.filter((id) => !inUse.has(id));

      if (inUse.size > 0) {
        await tx.loyaltyReward.updateMany({
          where: { id: { in: [...inUse] } },
          data: { status: RETIRED_REWARD_STATUS },
        });
      }
      if (deletable.length > 0) {
        await tx.loyaltyReward.deleteMany({ where: { id: { in: deletable } } });
      }
    }

    await tx.loyaltyProgram.update({
      where: { id: program.id },
      // The join and referral bonuses are edited on this step; they are programme columns
      // rather than reward rows, so they ride along with the step marker.
      data: { onboardingStep: "rewards", ...bonusFieldsOf(input) },
    });
  });

  return await prisma.loyaltyReward.findMany({
    where: { programId: program.id, rewardType: { not: LoyaltyRewardType.REVIEW } },
    orderBy: { pointsCost: "asc" },
  });
}

/* ── step: messages ─────────────────────────────────────────────────────────── */

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

    // The text is always kept: it is what goes out inside an open 24-hour window. A
    // template, when attached, is for customers who have never messaged the business.
    const waTemplateId = command.waTemplateId ?? null;
    const data = {
      type: command.type,
      requestMessage: keyword,
      content: toRichText(command.text),
      responseType: waTemplateId
        ? WaAutomatedReplyResponseType.Template
        : WaAutomatedReplyResponseType.Text,
      waTemplateId,
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
      await saveTriggerBody(program.id, template.eventType, template.body);
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

export async function submitEventTemplate(
  orgId: string,
  programId: string,
  template: { eventType: LoyaltyEventType; templateName: string; body: string },
): Promise<EventTemplateResult> {
  // Meta template names are unique per account. Re-running the step — or saving the
  // Program › Messages section — must point the trigger at the template that already
  // exists rather than file a duplicate submission Meta will reject.
  const existing = await getTemplateByNameAndOrgId(template.templateName, orgId);
  if (existing) {
    await upsertTrigger(programId, template.eventType, existing.id);
    return {
      eventType: template.eventType,
      templateName: template.templateName,
      status: metaStatusToStep(existing.data?.status),
      templateId: existing.id,
      reused: true,
    };
  }

  const submitted = await createTemplate(
    orgId,
    buildLoyaltyBodyTemplate(
      template.templateName,
      template.body,
      await loyaltyEventButtons(orgId, template.eventType),
    ),
  );
  const saved = await saveTemplate(submitted, orgId, {}, TemplateType.LOYALTY);

  await upsertTrigger(programId, template.eventType, saved.id);

  return {
    eventType: template.eventType,
    templateName: template.templateName,
    status: "pending",
    templateId: saved.id,
  };
}

/**
 * The Meta payload every loyalty notification is submitted as: body only, UTILITY, English.
 * Shared by the wizard and by Messages › Automatic, so a notification written in either
 * place is the same kind of template.
 */
export function buildLoyaltyBodyTemplate(
  templateName: string,
  body: string,
  buttons: WaTemplateButton[] = [],
): WaMetaTemplate {
  const placeholderCount = countPlaceholders(body);
  return {
    name: templateName,
    language: "en",
    category: WaTemplateCategory.UTILITY,
    components: [
      {
        type: WaTemplateComponentTypeUpperCase.BODY,
        text: body,
        // Meta rejects a body with variables unless it is given a sample for each one.
        ...(placeholderCount > 0
          ? {
              example: {
                body_text: [Array.from({ length: placeholderCount }, (_, i) => `Sample ${i + 1}`)],
              },
            }
          : {}),
      },
      ...(buttons.length > 0 ? [{ type: WaTemplateComponentTypeUpperCase.BUTTONS, buttons }] : []),
    ],
  };
}

/**
 * The buttons an event's template carries beyond its body. Only the new-customer welcome
 * has one: a Join quick reply labelled with the org's join keyword.
 */
export async function loyaltyEventButtons(
  orgId: string,
  eventType: LoyaltyEventType,
): Promise<WaTemplateButton[]> {
  if (eventType !== LoyaltyEventType.NEW_CUSTOMER_WELCOME) return [];
  const joinCommand = await prisma.loyaltyWaCommand.findFirst({
    where: { orgId, type: LoyaltyTemplateTypes.CustomerRegistration },
    select: { requestMessage: true },
  });
  return [{ type: "QUICK_REPLY", text: joinButtonLabel(joinCommand?.requestMessage) }];
}

/** Points the event at its template and switches it on; `body` is stored when given. */
export async function upsertTrigger(
  programId: string,
  eventType: LoyaltyEventType,
  waTemplateId: string,
  body?: string,
) {
  const data = { waTemplateId, enabled: true, ...(body === undefined ? {} : { body }) };
  const existingTrigger = await prisma.loyaltyEventTrigger.findFirst({
    where: { programId, eventType },
  });

  if (existingTrigger) {
    await prisma.loyaltyEventTrigger.update({ where: { id: existingTrigger.id }, data });
  } else {
    await prisma.loyaltyEventTrigger.create({ data: { programId, eventType, ...data } });
  }
}

/**
 * Stores the event's words before anything goes to Meta. A submission that fails or is
 * still in review must not cost the message: inside an open window the words are enough.
 */
export async function saveTriggerBody(
  programId: string,
  eventType: LoyaltyEventType,
  body: string,
) {
  await prisma.loyaltyEventTrigger.upsert({
    where: { programId_eventType: { programId, eventType } },
    update: { body },
    create: { programId, eventType, enabled: true, body },
  });
}

export function metaStatusToStep(status: unknown): EventTemplateResult["status"] {
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  return "pending";
}

function countPlaceholders(body: string): number {
  const matches = body.match(/\{\{(\d+)\}\}/g);
  if (!matches) return 0;
  return new Set(matches).size;
}

/* ── activate ───────────────────────────────────────────────────────────────── */

export async function activateProgram(orgId: string) {
  const program = await requireProgram(orgId);

  // The same reads the giveback endpoint uses, so the number quoted here is the one the
  // Overview shows afterwards.
  const [{ defaultRule, rewards, tiers }, waSettingsCount] = await Promise.all([
    loadProgramGivebackSources(program.id),
    prisma.whatsappSettings.count({ where: { orgId } }),
  ]);

  // Hard guard: without a default earning rule the engine awards nothing, so an
  // "active" programme would silently do nothing at all.
  if (!defaultRule) {
    throw new OnboardingError(
      "Add a default earning rule before activating — without one, customers earn nothing",
      409,
    );
  }

  const warnings: string[] = [];
  if (rewards.length === 0) {
    warnings.push("No rewards yet — customers can earn points but have nothing to redeem.");
  }
  if (waSettingsCount === 0) {
    warnings.push("No WhatsApp channel connected — loyalty messages cannot be delivered.");
  }
  if (program.tiersEnabled && program.tierQualificationWindowMonths !== null && tiers.length < 2) {
    warnings.push(
      "Tiers are on with a qualification window, but there is no VIP tier above Member — nobody can move up.",
    );
  }

  // What the programme costs. The wizard shows this live while the user is setting the
  // numbers, but activate is reachable without it (a resumed session that jumps straight
  // to review, a direct call), and the rewards catalog keeps changing after launch — so
  // this is the last point at which anyone checks. It never blocks: a deliberately
  // generous programme is a legitimate choice, the goal is only informed consent.
  const giveback = calculateGiveback(buildGivebackInput(program, defaultRule, rewards, tiers));

  // `band` is judged at the most generous tier, so the figure quoted has to be the same
  // one — quoting the base rate here would warn about a number the merchant cannot find.
  // When a tier is what crosses the line, name it: otherwise the warning sends them to
  // edit an earning rule that is perfectly reasonable.
  const pct = giveback.givebackPctTop;
  const viaTier =
    giveback.topTier && givebackBand(giveback.givebackPct) !== giveback.band
      ? ` (${giveback.topTier.name} members earn ${giveback.topTier.pointsMultiplier}x)`
      : "";

  if (giveback.band === "excessive" && pct !== null) {
    warnings.push(
      `This programme gives back about ${pct.toFixed(0)}% of revenue at its most generous reward` +
        `${giveback.bestReward ? ` (${giveback.bestReward.name})` : ""}${viaTier} — likely more than your margin on a sale.`,
    );
  } else if (giveback.band === "generous" && pct !== null) {
    warnings.push(
      `This programme gives back about ${pct.toFixed(1)}% of revenue at its most generous reward${viaTier} — more than most loyalty programmes. Fine if that is deliberate.`,
    );
  }

  // The existing hard guard only checks that a default rule *exists*, not that it awards
  // anything. A rule of 0 points per unit with no flat bonus activates a silent programme.
  if (giveback.status === "no_earning") {
    warnings.push(
      "Your default earning rule awards no points — customers will earn nothing on a purchase.",
    );
  }

  if (giveback.status === "needs_average_order_value") {
    warnings.push(
      "We could not estimate what this programme costs you — set a typical order value in loyalty settings.",
    );
  }

  const activated = await prisma.loyaltyProgram.update({
    where: { id: program.id },
    data: { status: ACTIVE, onboardingCompletedAt: new Date() },
  });

  return { program: activated, warnings };
}

export type { LoyaltyPresetKey };
