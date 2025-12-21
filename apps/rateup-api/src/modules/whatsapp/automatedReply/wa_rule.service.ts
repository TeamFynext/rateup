import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { CreateRuleInput, UpdateRuleInput } from "./wa_rule.schema.js";

const MESSAGE_BODY_FIELD = "MESSAGE_BODY";

type MessageBodyCandidate = {
  value: string;
  businessHourId: string | null;
};

function extractMessageBodyCandidates(
  groups?: CreateRuleInput["groups"],
  options?: CreateRuleInput["options"],
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
      if (
        condition.field === MESSAGE_BODY_FIELD &&
        typeof rawValue === "string"
      ) {
        const value = rawValue.trim();
        if (value.length > 0) {
          candidates.push({ value, businessHourId });
        }
      }
    }
  }

  return candidates;
}

function ensureNoDuplicateMessageBodyCandidates(
  candidates: MessageBodyCandidate[],
) {
  if (candidates.length < 2) return;

  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const candidate of candidates) {
    const key = `${candidate.value}::$${candidate.businessHourId ?? ""}`;
    if (seen.has(key)) {
      duplicates.add(key);
    }
    seen.add(key);
  }

  if (duplicates.size) {
    const formatted = Array.from(duplicates)
      .map((key) => {
        const [value, businessHourPart] = key.split("::$");
        return businessHourPart
          ? `'${value}' (businessHourId: ${businessHourPart})`
          : `'${value}'`;
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
    candidates.map(async ({ value, businessHourId }) => {
      const existing = await prisma.ruleMessageBodyLock.findFirst({
        where: {
          orgId,
          messageBody: value,
          businessHourId: businessHourId ?? null,
        },
        select: {
          ruleCondition: {
            select: {
              group: {
                select: {
                  ruleId: true,
                },
              },
            },
          },
        },
      });

      if (!existing) return;

      const linkedRuleId = existing.ruleCondition?.group.ruleId;

      if (linkedRuleId && linkedRuleId === excludeRuleId) return;

      throw new Error(
        businessHourId
          ? `Message body '${value}' is already reserved for business hour '${businessHourId}'`
          : `Message body '${value}' is already reserved`,
      );
    }),
  );
}

async function clearMessageBodyReservations(
  tx: Prisma.TransactionClient,
  ruleId: string,
) {
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
    ruleOptions?.businessHours?.enabled &&
    ruleOptions.businessHours.businessHoursId
      ? ruleOptions.businessHours.businessHoursId
      : null;

  for (const group of rule.groups) {
    for (const condition of group.conditions) {
      if (
        condition.field === MESSAGE_BODY_FIELD &&
        typeof condition.value === "string"
      ) {
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
      ruleConditionId: entry.ruleConditionId,
      businessHourId: entry.businessHourId ?? null,
    })),
  });
}

// Create Rule
export async function createRule(data: CreateRuleInput & { orgId: string }) {
  const { groups, actions, options, orgId } = data;

  const messageBodyCandidates = extractMessageBodyCandidates(groups, options);
  ensureNoDuplicateMessageBodyCandidates(messageBodyCandidates);
  await ensureMessageBodyUniqueness(orgId, messageBodyCandidates);

  return prisma.$transaction(async (tx) => {
    const ruleCreateData: Prisma.RuleCreateInput = {
      name: data.name,
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

    await reserveMessageBodyCommands(tx, rule.id, orgId);

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
    select: { orgId: true },
  });

  if (!existingRule) {
    throw new Error("Rule not found");
  }

  const { groups, actions, options, ...rest } = data;

  let messageBodyCandidates: MessageBodyCandidate[] = [];

  if (groups) {
    messageBodyCandidates = extractMessageBodyCandidates(groups, options);
    ensureNoDuplicateMessageBodyCandidates(messageBodyCandidates);
    await ensureMessageBodyUniqueness(
      existingRule.orgId,
      messageBodyCandidates,
      id,
    );
  }

  return prisma.$transaction(async (tx) => {
    if (groups) {
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
export async function getRulesByAutomationId(
  automationId: string,
  orgId: string,
) {
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
