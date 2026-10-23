import { Prisma, RulePlatform } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { ActionType } from "../../../../generated/prisma/enums.js";
import { assertPublicUrl, PublicUrlError } from "../../../utils/ssrf.js";
import { CreateRuleInput, requestedPlatforms, UpdateRuleInput } from "./wa_rule.schema.js";

const MESSAGE_BODY_FIELD = "MESSAGE_BODY";

interface MessageBodyCandidate {
  value: string;
  businessHourId: string | null;
  platform: string;
}

/** A keyword is claimed once per channel the rule runs on. */
function extractMessageBodyCandidates(
  groups: CreateRuleInput["groups"] | undefined,
  options: CreateRuleInput["options"] | undefined,
  platforms: readonly string[],
) {
  if (!groups?.length) return [];

  const candidates: MessageBodyCandidate[] = [];

  // Extract businessHourId from options instead of conditions
  const businessHourId =
    options?.businessHours?.enabled && options.businessHours.businessHoursId
      ? options.businessHours.businessHoursId
      : null;

  for (const group of groups) {
    for (const condition of group.conditions) {
      const rawValue = condition.value;
      if (condition.field === MESSAGE_BODY_FIELD && typeof rawValue === "string") {
        const value = rawValue.trim();
        if (value.length > 0) {
          for (const platform of platforms) {
            candidates.push({ value, businessHourId, platform });
          }
        }
      }
    }
  }

  return candidates;
}

function ensureNoDuplicateMessageBodyCandidates(candidates: MessageBodyCandidate[]) {
  if (candidates.length < 2) return;

  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const candidate of candidates) {
    const key = `${candidate.platform}::${candidate.value}::$${candidate.businessHourId ?? ""}`;
    if (seen.has(key)) {
      duplicates.add(key);
    }
    seen.add(key);
  }

  if (duplicates.size) {
    const formatted = Array.from(duplicates)
      .map((key) => {
        const [value, businessHourPart] = key.split("::$");
        return businessHourPart ? `'${value}' (businessHourId: ${businessHourPart})` : `'${value}'`;
      })
      .join(", ");
    throw new Error(
      `Duplicate message body and business hour combination(s) not allowed: ${formatted}`,
    );
  }
}

async function ensureMessageBodyUniqueness(
  orgId: string,
  candidates: MessageBodyCandidate[],
  excludeRuleId?: string,
) {
  if (!candidates.length) return;

  await Promise.all(
    candidates.map(async ({ value, businessHourId, platform }) => {
      const existing = await prisma.ruleMessageBodyLock.findFirst({
        where: {
          orgId,
          messageBody: value,
          platform: platform as RulePlatform,
          businessHourId: businessHourId ?? null,
        },
        select: {
          ruleCondition: {
            select: {
              group: {
                select: {
                  ruleId: true,
                  rule: {
                    select: {
                      isActive: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!existing) return;

      const linkedRuleId = existing.ruleCondition?.group.ruleId;

      if (linkedRuleId && linkedRuleId === excludeRuleId) return;

      const isLinkedRuleActive = existing.ruleCondition?.group.rule?.isActive;

      if (!isLinkedRuleActive) return;

      const conflictingRuleName = existing.ruleCondition?.group.rule?.name;
      const ruleNamePart = conflictingRuleName ? " ('" + conflictingRuleName + "')" : "";
      const channelPart = " on " + PLATFORM_LABEL[platform as RulePlatform];
      const context = businessHourId ? " during the configured business hours" : "";
      const baseMsg =
        "Keyword '" +
        value +
        "' is already used by another active automation" +
        ruleNamePart +
        channelPart +
        context +
        ". Please disable that automation first to enable this one.";

      throw new Error(baseMsg);
    }),
  );
}

async function clearMessageBodyReservations(tx: Prisma.TransactionClient, ruleId: string) {
  await tx.ruleMessageBodyLock.deleteMany({
    where: {
      ruleCondition: {
        group: {
          ruleId,
        },
      },
    },
  });
}

async function reserveMessageBodyCommands(
  tx: Prisma.TransactionClient,
  ruleId: string,
  orgId: string,
) {
  const rule = await tx.rule.findUnique({
    where: { id: ruleId },
    select: {
      platform: true,
      platforms: true,
      options: true,
      groups: {
        select: {
          conditions: {
            select: {
              id: true,
              field: true,
              value: true,
            },
          },
        },
      },
    },
  });

  if (!rule) return;

  const data: Array<{
    orgId: string;
    command: string;
    ruleConditionId: string;
    businessHourId?: string | null;
  }> = [];

  // Extract businessHourId from rule options
  const ruleOptions = rule.options;
  const businessHourId =
    ruleOptions?.businessHours?.enabled && ruleOptions.businessHours.businessHoursId
      ? ruleOptions.businessHours.businessHoursId
      : null;

  for (const group of rule.groups) {
    for (const condition of group.conditions) {
      if (condition.field === MESSAGE_BODY_FIELD && typeof condition.value === "string") {
        const command = condition.value.trim();
        if (command.length > 0) {
          data.push({
            orgId,
            command,
            ruleConditionId: condition.id,
            businessHourId,
          });
        }
      }
    }
  }

  if (!data.length) return;

  const platforms = rule.platforms.length ? rule.platforms : [rule.platform];
  await tx.ruleMessageBodyLock.createMany({
    data: data.flatMap((entry) =>
      platforms.map((platform) => ({
        orgId: entry.orgId,
        messageBody: entry.command,
        platform,
        ruleConditionId: entry.ruleConditionId,
        businessHourId: entry.businessHourId ?? null,
      })),
    ),
  });
}

/** Triggers that never match on message text, so they reserve no keyword. */
function triggerSkipsKeywordLock(triggerEvent: string) {
  return (
    triggerEvent === "INSTAGRAM_COMMENT" ||
    triggerEvent === "INSTAGRAM_STORY_MENTION" ||
    triggerEvent === "INSTAGRAM_REFERRAL" ||
    triggerEvent === "WHATSAPP_AD_REFERRAL" ||
    triggerEvent === "MESSENGER_REFERRAL" ||
    triggerEvent === "FACEBOOK_COMMENT"
  );
}

const PLATFORM_LABEL: Record<RulePlatform, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Messenger",
};

const RULE_PLATFORMS = Object.values(RulePlatform);

/**
 * The channels a rule runs on, read from the accounts it is attached to, in a stable order. A
 * request that names its channels has to agree with its accounts, because the channels are what
 * the trigger and action checks were run against. An account no longer connected tells us
 * nothing, so with none recognised the request's own channels stand.
 */
async function resolveRulePlatforms(
  orgId: string,
  accountIds: readonly string[],
  requested: RulePlatform[] | undefined,
): Promise<RulePlatform[]> {
  const channels = await prisma.channel.findMany({
    where: { orgId, accountId: { in: [...accountIds] }, platform: { in: RULE_PLATFORMS } },
    select: { platform: true },
  });
  const found = RULE_PLATFORMS.filter((platform) =>
    channels.some((channel) => channel.platform === platform),
  );
  if (!found.length) return requested?.length ? requested : [RulePlatform.WHATSAPP];

  const extra = found.filter((platform) => requested && !requested.includes(platform));
  if (extra.length) {
    throw new Error(
      `The ticked accounts include ${extra.map((p) => PLATFORM_LABEL[p]).join(" and ")}, which this automation is not set up for`,
    );
  }
  return found;
}

/**
 * A CALL_EXTERNAL_API action posts to a URL the rule author typed, so it is refused at save
 * time unless it resolves to a public address (the send path checks again before each call).
 * An empty value is left alone: templates start that way and the action then does nothing.
 * Throws PublicUrlError, which the controller answers with a 400.
 */
export async function assertRuleActionUrls(actions: CreateRuleInput["actions"] | undefined) {
  for (const action of actions ?? []) {
    if (action.type !== ActionType.CALL_EXTERNAL_API) continue;
    const value: unknown = action.value;
    if (value === undefined || value === null || value === "") continue;
    if (typeof value !== "string") {
      throw new PublicUrlError("The external API action needs a URL");
    }
    await assertPublicUrl(value, { allowHttp: true });
  }
}

// Create Rule
export async function createRule(data: CreateRuleInput & { orgId: string }) {
  const { groups, actions, options, orgId } = data;
  await assertRuleActionUrls(actions);
  const platforms = await resolveRulePlatforms(
    orgId,
    data.whatsappSettingsPhoneIds,
    requestedPlatforms(data),
  );

  const skipMessageBodyLock = triggerSkipsKeywordLock(data.triggerEvent);

  const messageBodyCandidates = skipMessageBodyLock
    ? []
    : extractMessageBodyCandidates(groups, options, platforms);
  ensureNoDuplicateMessageBodyCandidates(messageBodyCandidates);
  await ensureMessageBodyUniqueness(orgId, messageBodyCandidates);

  return prisma.$transaction(async (tx) => {
    const ruleCreateData: Prisma.RuleCreateInput = {
      name: data.name,
      platform: platforms[0],
      platforms,
      triggerEvent: data.triggerEvent,
      whatsappSettingsPhoneIds: data.whatsappSettingsPhoneIds,
      isActive: data.isActive ?? true,
      operator: data.operator ?? "AND",
      options: options ?? Prisma.DbNull,
      org: {
        connect: { id: orgId },
      },
      groups: {
        create:
          groups?.map((group) => ({
            operator: group.operator,
            conditions: {
              createMany: {
                data: group.conditions.map((condition) => ({
                  field: condition.field,
                  operator: condition.operator,
                  value: condition.value,
                })),
              },
            },
          })) || [],
      },
      actions: {
        createMany: {
          data:
            actions?.map((action) => ({
              type: action.type,
              value: action.value,
            })) || [],
        },
      },
    };

    const rule = await tx.rule.create({
      data: ruleCreateData,
      include: {
        groups: {
          include: { conditions: true },
        },
        actions: true,
      },
    });

    if (!skipMessageBodyLock) {
      await reserveMessageBodyCommands(tx, rule.id, orgId);
    }

    return rule;
  });
}

// Get all Rules for an org. orgId is required so the filter can never be dropped.
export async function getAllRules(orgId: string) {
  return prisma.rule.findMany({
    where: { orgId },
    include: {
      groups: {
        include: { conditions: true },
      },
      actions: true,
    },
  });
}

// Get Rule by ID, scoped to the caller's org so another org's rule is
// indistinguishable from one that never existed.
export async function getRuleById(id: string, orgId: string) {
  return prisma.rule.findFirst({
    where: { id, orgId },
    include: {
      groups: {
        include: { conditions: true },
      },
      actions: true,
    },
  });
}

// Update Rule
export async function updateRule(id: string, orgId: string, data: UpdateRuleInput) {
  // Scoped to the caller's org: another org's rule reads as missing.
  const existingRule = await prisma.rule.findFirst({
    where: { id, orgId },
    select: {
      orgId: true,
      platform: true,
      platforms: true,
      whatsappSettingsPhoneIds: true,
      triggerEvent: true,
      isActive: true,
      groups: {
        select: {
          conditions: {
            select: { field: true, value: true },
          },
        },
      },
      options: true,
    },
  });

  if (!existingRule) {
    throw new Error("Rule not found");
  }

  const { groups, actions, options, platform: _platform, platforms: _platforms, ...rest } = data;
  await assertRuleActionUrls(actions);

  const existingPlatforms = existingRule.platforms.length
    ? existingRule.platforms
    : [existingRule.platform];
  // Channels are re-read only when the accounts or the channels themselves are being changed.
  const channelsTouched = Boolean(
    data.whatsappSettingsPhoneIds || data.platform || data.platforms?.length,
  );
  const platforms = channelsTouched
    ? await resolveRulePlatforms(
        existingRule.orgId,
        data.whatsappSettingsPhoneIds ?? existingRule.whatsappSettingsPhoneIds,
        requestedPlatforms(data),
      )
    : existingPlatforms;
  const platformsChanged =
    platforms.length !== existingPlatforms.length ||
    platforms.some((platform) => !existingPlatforms.includes(platform));

  // When disabling a rule, skip uniqueness checks entirely
  const isDisabling = data.isActive === false;
  // When enabling a previously inactive rule, check existing conditions for conflicts
  const isEnabling = data.isActive === true && !existingRule.isActive;

  const triggerEvent = data.triggerEvent ?? existingRule.triggerEvent;
  const skipMessageBodyLock = triggerSkipsKeywordLock(triggerEvent);

  let messageBodyCandidates: MessageBodyCandidate[] = [];

  // New channels claim the rule's existing keywords too, so they are re-locked like new groups.
  const relock = !skipMessageBodyLock && Boolean(groups || platformsChanged);

  if (!isDisabling && !skipMessageBodyLock) {
    if (groups) {
      messageBodyCandidates = extractMessageBodyCandidates(groups, options, platforms);
      ensureNoDuplicateMessageBodyCandidates(messageBodyCandidates);
      await ensureMessageBodyUniqueness(existingRule.orgId, messageBodyCandidates, id);
    } else if (isEnabling || platformsChanged) {
      const existingOptions = existingRule.options as CreateRuleInput["options"] | null;
      messageBodyCandidates = extractMessageBodyCandidates(
        existingRule.groups as CreateRuleInput["groups"],
        options ?? existingOptions ?? undefined,
        platforms,
      );
      await ensureMessageBodyUniqueness(existingRule.orgId, messageBodyCandidates, id);
    }
  }

  return prisma.$transaction(async (tx) => {
    if (relock) {
      await clearMessageBodyReservations(tx, id);
    }

    const updatedRule = await tx.rule.update({
      where: { id, orgId },
      data: {
        ...rest,
        ...(channelsTouched && { platform: platforms[0], platforms }),
        // Only update options if they are explicitly provided in the update data
        ...(options !== undefined && { options: options || null }),
        // Only update groups if they are explicitly provided in the update data
        ...(groups && {
          groups: {
            deleteMany: {},
            create: groups.map((group) => ({
              operator: group.operator,
              conditions: {
                createMany: {
                  data: group.conditions.map((condition) => ({
                    field: condition.field,
                    operator: condition.operator,
                    value: condition.value,
                  })),
                },
              },
            })),
          },
        }),
        // Only update actions if they are explicitly provided in the update data
        ...(actions && {
          actions: {
            deleteMany: {},
            createMany: {
              data: actions.map((action) => ({
                type: action.type,
                value: action.value,
              })),
            },
          },
        }),
      },
      include: {
        groups: {
          include: { conditions: true },
        },
        actions: true,
      },
    });

    if (relock) {
      await reserveMessageBodyCommands(tx, id, existingRule.orgId);
    }

    return updatedRule;
  });
}

// Delete Rule
export async function deleteRule(id: string, orgId: string) {
  return prisma.$transaction(async (tx) => {
    await clearMessageBodyReservations(tx, id);
    // Another org's rule matches nothing: Prisma throws P2025 and the reservation clear
    // above rolls back with it.
    return tx.rule.delete({ where: { id, orgId } });
  });
}

// Get Rules by Automation ID (from action value)
export async function getRulesByAutomationId(automationId: string, orgId: string) {
  const data = await prisma.ruleAction.findMany({
    where: {
      value: {
        equals: automationId,
      },
      rule: {
        orgId,
      },
    },
    include: {
      rule: true,
    },
  });
  return data.map((item) => item.rule);
}
