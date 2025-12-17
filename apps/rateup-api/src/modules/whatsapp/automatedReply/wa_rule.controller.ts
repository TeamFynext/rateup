import { FastifyRequest, FastifyReply } from "fastify";
import * as RuleService from "./wa_rule.service.js";
import { CreateRuleInput, UpdateRuleInput } from "./wa_rule.schema.js";
import prisma from "../../../utils/prisma.js";
import { PrismaClientKnownRequestError } from "../../../../generated/prisma/internal/prismaNamespace.js";

// Create Rule
export async function createRuleHandler(
  req: FastifyRequest<{ Body: CreateRuleInput }>, // FastifyRequest<{ Body: CreateRuleInput }>
  reply: FastifyReply,
) {
  try {
    const orgId = req.user.orgId;
    const rule = await RuleService.createRule({ ...req.body, orgId });
    reply.send(rule);
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return reply.status(400).send({
        error: "Failed to create rule",
        message: "Rule with the same name already exists in the organization",
      });
    }
    req.log.error(error);
    reply.status(500).send({
      error: "Failed to create rule",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Get all Rules
export async function getAllRulesHandler(
  req: FastifyRequest<{ Querystring: { orgId?: string } }>, // FastifyRequest<{ Querystring: { orgId?: string } }>
  reply: FastifyReply,
) {
  try {
    const { orgId } = req.query;
    const rules = await RuleService.getAllRules(orgId);
    reply.send(rules);
  } catch (error) {
    req.log.error(error);
    reply.status(500).send({
      error: "Failed to fetch rules",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Get Rule by ID
export async function getRuleByIdHandler(
  req: FastifyRequest<{ Params: { id: string } }>, // FastifyRequest<{ Params: { id: string } }>
  reply: FastifyReply,
) {
  try {
    const { id } = req.params;
    const rule = await RuleService.getRuleById(id);
    if (!rule) {
      return reply.status(404).send({ error: "Rule not found" });
    }
    reply.send(rule);
  } catch (error) {
    req.log.error(error);
    reply.status(500).send({
      error: "Failed to fetch rule",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Update Rule
export async function updateRuleHandler(
  req: FastifyRequest<{ Params: { id: string }; Body: UpdateRuleInput }>, // FastifyRequest<{ Params: { id: string }; Body: UpdateRuleInput }>
  reply: FastifyReply,
) {
  try {
    const { id } = req.params;
    const rule = await RuleService.updateRule(id, req.body);
    reply.send(rule);
  } catch (error) {
    req.log.error(error);
    reply.status(500).send({
      error: "Failed to update rule",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Delete Rule
export async function deleteRuleHandler(
  req: FastifyRequest<{ Params: { id: string } }>, // FastifyRequest<{ Params: { id: string } }>
  reply: FastifyReply,
) {
  try {
    const { id } = req.params;
    await RuleService.deleteRule(id);
    reply.send({ success: true });
  } catch (error) {
    req.log.error(error);
    reply.status(500).send({
      error: "Failed to delete rule",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
