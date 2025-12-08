import prisma from "../../../utils/prisma";
import { CreateRuleInput, UpdateRuleInput } from "./wa_rule.schema";

// Create Rule
export async function createRule(data: CreateRuleInput & { orgId: string }) {
  const { groups, actions, ...rest } = data;
  return prisma.rule.create({
    data: {
      name: data.name,
      orgId: data.orgId,
      whatsappSettingsPhoneIds: data.whatsappSettingsPhoneIds,
      triggerEvent: data.triggerEvent,
      ...rest,
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
    },
    include: {
      groups: {
        include: { conditions: true },
      },
      actions: true,
    },
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
  const { groups, actions, ...rest } = data;
  return prisma.rule.update({
    where: { id },
    data: {
      ...rest,
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
}

// Delete Rule
export async function deleteRule(id: string) {
  return prisma.rule.delete({ where: { id } });
}
