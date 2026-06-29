import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { CreateRuleInput, UpdateRuleInput } from "./wa_rule.schema.js";

const MESSAGE_BODY_FIELD = "MESSAGE_BODY";

interface MessageBodyCandidate {
  value: string;
  businessHourId: string | null;
  platform: string;
}

function extractMessageBodyCandidates(
  groups?: CreateRuleInput["groups"],
  options?: CreateRuleInput["options"],
  platform?: string,
) {
  if (!groups?.length) return [];

  const candidates: MessageBodyCandidate[] = [];
  const resolvedPlatform = platform ?? "WHATSAPP";

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
          candidates.push({
            value,
            businessHourId,
            platform: resolvedPlatform,
          });
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
          platform: platform as any,
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
      const context = businessHourId ? " during the configured business hours" : "";
      const baseMsg =
        "Keyword '" +
        value +
        "' is already used by another active automation" +
        ruleNamePart +
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
  const ruleOptions = rule.options as any;
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

  await tx.ruleMessageBodyLock.createMany({
    data: data.map((entry) => ({
      orgId: entry.orgId,
      messageBody: entry.command,
      platform: rule.platform,
      ruleConditionId: entry.ruleConditionId,
      businessHourId: entry.businessHourId ?? null,
    })),
  });
}

// Create Rule
export async function createRule(data: CreateRuleInput & { orgId: string }) {
  const { groups, actions, options, orgId } = data;

  const skipMessageBodyLock =
    data.triggerEvent === "INSTAGRAM_COMMENT" || data.triggerEvent === "INSTAGRAM_STORY_MENTION";

  const messageBodyCandidates = skipMessageBodyLock
    ? []
    : extractMessageBodyCandidates(groups, options, data.platform);
  ensureNoDuplicateMessageBodyCandidates(messageBodyCandidates);
  await ensureMessageBodyUniqueness(orgId, messageBodyCandidates);

  return prisma.$transaction(async (tx) => {
    const ruleCreateData: Prisma.RuleCreateInput = {
      name: data.name,
      platform: data.platform ?? "WHATSAPP",
      triggerEvent: data.triggerEvent,
      whatsappSettingsPhoneIds: data.whatsappSettingsPhoneIds,
      isActive: data.isActive ?? true,
      operator: data.operator ?? "AND",
      options: options || null,
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

// Get all Rules (optionally by orgId)
export async function getAllRules(orgId?: string) {
  return prisma.rule.findMany({
    where: orgId ? { orgId } : undefined,
    include: {
      groups: {
        include: { conditions: true },
      },
      actions: true,
    },
  });
}

// Get Rule by ID
export async function getRuleById(id: string) {
  return prisma.rule.findUnique({
    where: { id },
    include: {
      groups: {
        include: { conditions: true },
      },
      actions: true,
    },
  });
}

// Update Rule
export async function updateRule(id: string, data: UpdateRuleInput) {
  const existingRule = await prisma.rule.findUnique({
    where: { id },
    select: {
      orgId: true,
      platform: true,
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

  const { groups, actions, options, ...rest } = data;

  // When disabling a rule, skip uniqueness checks entirely
  const isDisabling = data.isActive === false;
  // When enabling a previously inactive rule, check existing conditions for conflicts
  const isEnabling = data.isActive === true && !existingRule.isActive;

  const triggerEvent = data.triggerEvent ?? existingRule.triggerEvent;
  const skipMessageBodyLock =
    triggerEvent === "INSTAGRAM_COMMENT" || triggerEvent === "INSTAGRAM_STORY_MENTION";

  let messageBodyCandidates: MessageBodyCandidate[] = [];

  if (!isDisabling && !skipMessageBodyLock) {
    const platform = data.platform ?? existingRule.platform;
    if (groups) {
      messageBodyCandidates = extractMessageBodyCandidates(groups, options, platform);
      ensureNoDuplicateMessageBodyCandidates(messageBodyCandidates);
      await ensureMessageBodyUniqueness(existingRule.orgId, messageBodyCandidates, id);
    } else if (isEnabling) {
      const existingOptions = existingRule.options as CreateRuleInput["options"] | null;
      const existingCandidates = extractMessageBodyCandidates(
        existingRule.groups as CreateRuleInput["groups"],
        existingOptions ?? undefined,
        platform,
      );
      await ensureMessageBodyUniqueness(existingRule.orgId, existingCandidates, id);
    }
  }

  return prisma.$transaction(async (tx) => {
    if (groups && !skipMessageBodyLock) {
      await clearMessageBodyReservations(tx, id);
    }

    const updatedRule = await tx.rule.update({
      where: { id },
      data: {
        ...rest,
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

    if (groups && messageBodyCandidates.length) {
      await reserveMessageBodyCommands(tx, id, existingRule.orgId);
    }

    return updatedRule;
  });
}

// Delete Rule
export async function deleteRule(id: string) {
  return prisma.$transaction(async (tx) => {
    await clearMessageBodyReservations(tx, id);
    return tx.rule.delete({ where: { id } });
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
