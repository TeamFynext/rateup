import bcrypt from "bcrypt";
import { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";

import { Role } from "../../../../generated/prisma/client.js";
import { declareAccess } from "../../../../authz/registry.js";
import {
  ExternalApiError,
  externalErrorHandler,
  type ExternalErrorCode,
} from "../../../../external/shared/errors.js";
import { loadProgram, requireLoyaltySubscription } from "../../../../external/v2/loyalty/guards.js";
import {
  memberSummary,
  rewardCatalogue,
} from "../../../../external/v2/loyalty/loyalty.controller.js";
import prisma from "../../../../utils/prisma.js";
import { contactWhereIdentity } from "../../../contacts/identity/contactFields.js";
import { rateLimit } from "../../../../utils/rateLimit.js";
import {
  agentBackInStock,
  agentOrderStatus,
  agentSearchProducts,
  agentStartCheckout,
} from "../../../commerce/shop/agentShop.service.js";
import { ShopError } from "../../../commerce/shop/shop.errors.js";
import { resolvePipelineForContact } from "../../../pipelines/pipelineLead/lead.service.js";
import {
  executeAssignStageAction,
  executeAssignTeamAction,
  executeAttachLabelAction,
} from "../../../automation/rules/rules.utils.js";

/**
 * The endpoints behind the Meta AI agent's built-in RateUp connector. Meta calls
 * these mid-conversation, with the key RateUp handed it at install.
 *
 * Every customer-specific call carries `phone`, which the tool definitions bind
 * to Meta's WHATSAPP_PHONE_NUMBER macro. The agent never chooses it, so it can
 * only ever act on the customer it is talking to — whatever that customer types.
 *
 * Nothing here sends a WhatsApp message. Meta hands the thread to whichever app
 * sends, so a message from RateUp would take the conversation off the agent.
 */

const agentParams = z.object({ agentId: z.guid() });
type AgentParams = z.infer<typeof agentParams>;

const phoneField = z.string().trim().min(4).max(32);
const phoneQuery = z.object({ phone: phoneField });
const nameBody = (field: "label" | "stage" | "team") =>
  z.object({ phone: phoneField, [field]: z.string().trim().min(1).max(128) } as const);

/** Contacts are stored as bare digits; the macro sends E.164. */
const digits = (phone: string) => phone.replace(/\D/g, "");

/** Case- and spacing-blind, since the agent types what the customer said. */
const sameName = (a: string, b: string) =>
  a.trim().toLowerCase().replace(/\s+/g, " ") === b.trim().toLowerCase().replace(/\s+/g, " ");

function notFound(
  code: "label_not_found" | "stage_not_found" | "team_not_found",
  what: string,
  name: string,
  choices: string[],
) {
  return new ExternalApiError(404, code, `No ${what} named "${name}"`, { available: choices });
}

async function authenticate(request: FastifyRequest<{ Params: AgentParams }>) {
  const agent = await prisma.metaBusinessAgent.findUnique({
    where: { id: request.params.agentId },
    select: { orgId: true, rateupToolsKeyHash: true },
  });
  const header = request.headers.authorization;
  const key = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  // One answer for every failure, so the path cannot be used to probe for agents.
  if (
    !agent?.rateupToolsKeyHash ||
    !key ||
    !(await bcrypt.compare(key, agent.rateupToolsKeyHash))
  ) {
    throw new ExternalApiError(401, "unauthorized", "Invalid access token");
  }
  request.orgId = agent.orgId;
  // What the shared loyalty guards read the org from.
  request.user = { orgId: agent.orgId, role: Role.SUPER_ADMIN };
}

async function contactId(orgId: string, phone: string) {
  const contact = await prisma.contact.findFirst({
    where: { orgId, ...contactWhereIdentity("phone", phone) },
    select: { id: true },
  });
  if (!contact) {
    throw new ExternalApiError(404, "contact_not_found", "This customer is not a contact yet");
  }
  return contact.id;
}

export async function rateupToolsRoutes(server: FastifyInstance) {
  // Authenticated below by the connector key, not by a session.
  declareAccess(server, { access: "token" });
  server.setErrorHandler(externalErrorHandler);

  server.addHook(
    "preHandler",
    rateLimit({
      max: 600,
      windowSeconds: 60,
      key: "metaAgentTools",
      keyFrom: (request) => (request.params as Partial<AgentParams> | undefined)?.agentId,
      throwOnLimit: (kind) =>
        kind === "rate_limited"
          ? new ExternalApiError(429, "rate_limited", "Too many requests")
          : new ExternalApiError(503, "internal_error", "Temporarily unavailable"),
    }),
  );
  server.addHook("preHandler", (request) =>
    authenticate(request as FastifyRequest<{ Params: AgentParams }>),
  );

  // ---- loyalty ----
  server.get<{ Params: AgentParams; Querystring: z.infer<typeof phoneQuery> }>(
    "/:agentId/loyalty/member",
    { schema: { params: agentParams, querystring: phoneQuery } },
    async (request) => {
      await requireLoyaltySubscription(request);
      const program = await loadProgram(request);
      const summary = await memberSummary(program, request.user.orgId, {
        phone: `+${digits(request.query.phone)}`,
      });
      // What a customer asks about; transaction history and staff-side lists stay out.
      return {
        member: summary.member,
        tier: summary.tier,
        rewardsTheyCanAfford: summary.availableRewards,
        vouchersReadyToUse: summary.pendingVouchers,
        program: summary.program,
      };
    },
  );

  server.get<{ Params: AgentParams }>(
    "/:agentId/loyalty/rewards",
    { schema: { params: agentParams } },
    async (request) => {
      await requireLoyaltySubscription(request);
      const program = await loadProgram(request);
      return { rewards: await rewardCatalogue(program.id) };
    },
  );

  // ---- crm ----
  server.get<{ Params: AgentParams }>(
    "/:agentId/crm/options",
    { schema: { params: agentParams } },
    async (request) => {
      const orgId = request.user.orgId;
      const pipelineId = await resolvePipelineForContact(orgId);
      const [labels, stages, teams] = await Promise.all([
        prisma.contactLabel.findMany({ where: { orgId }, select: { name: true } }),
        pipelineId
          ? prisma.pipelineStage.findMany({
              where: { pipelineId },
              orderBy: { order: "asc" },
              select: { name: true },
            })
          : [],
        prisma.team.findMany({ where: { orgId }, select: { name: true } }),
      ]);
      return {
        labels: labels.map((l) => l.name),
        stages: stages.map((s) => s.name),
        teams: teams.map((t) => t.name),
      };
    },
  );

  const labelBody = nameBody("label");
  server.post<{ Params: AgentParams; Body: z.infer<typeof labelBody> }>(
    "/:agentId/crm/label",
    { schema: { params: agentParams, body: labelBody } },
    async (request) => {
      const orgId = request.user.orgId;
      const { phone, label } = request.body;
      const labels = await prisma.contactLabel.findMany({
        where: { orgId },
        select: { id: true, name: true },
      });
      const match = labels.find((l) => sameName(l.name, label));
      // Only existing labels: an agent inventing labels would litter the inbox.
      if (!match) {
        throw notFound(
          "label_not_found",
          "label",
          label,
          labels.map((l) => l.name),
        );
      }
      await contactId(orgId, phone);
      await executeAttachLabelAction(match.id, { orgId, phone: digits(phone) });
      return { ok: true, label: match.name };
    },
  );

  const stageBody = nameBody("stage");
  server.post<{ Params: AgentParams; Body: z.infer<typeof stageBody> }>(
    "/:agentId/crm/stage",
    { schema: { params: agentParams, body: stageBody } },
    async (request) => {
      const orgId = request.user.orgId;
      const { phone, stage } = request.body;
      // The same board automation rules move leads on.
      const pipelineId = await resolvePipelineForContact(orgId);
      if (!pipelineId) {
        throw new ExternalApiError(422, "no_pipeline", "This business has no lead board");
      }
      const stages = await prisma.pipelineStage.findMany({
        where: { pipelineId },
        select: { id: true, name: true },
      });
      const match = stages.find((s) => sameName(s.name, stage));
      if (!match) {
        throw notFound(
          "stage_not_found",
          "stage",
          stage,
          stages.map((s) => s.name),
        );
      }
      await contactId(orgId, phone);
      await executeAssignStageAction(match.id, { orgId, phone: digits(phone) });
      return { ok: true, stage: match.name };
    },
  );

  const teamBody = nameBody("team");
  server.post<{ Params: AgentParams; Body: z.infer<typeof teamBody> }>(
    "/:agentId/crm/team",
    { schema: { params: agentParams, body: teamBody } },
    async (request) => {
      const orgId = request.user.orgId;
      const { phone, team } = request.body;
      const teams = await prisma.team.findMany({
        where: { orgId },
        select: { id: true, name: true },
      });
      const match = teams.find((t) => sameName(t.name, team));
      if (!match) {
        throw notFound(
          "team_not_found",
          "team",
          team,
          teams.map((t) => t.name),
        );
      }
      await contactId(orgId, phone);
      const assigned = await executeAssignTeamAction(match.id, { orgId, phone: digits(phone) });
      if (!assigned) {
        throw new ExternalApiError(422, "team_empty", `The ${match.name} team has no members`);
      }
      return { ok: true, team: match.name };
    },
  );

  // ---- shop ----
  const SHOP_ERROR_CODES: Record<ShopError["code"], ExternalErrorCode> = {
    NOT_FOUND: "not_found",
    INVALID: "invalid",
    OUT_OF_STOCK: "out_of_stock",
    DISCOUNT_INVALID: "discount_invalid",
    PAYMENT_UNAVAILABLE: "payment_unavailable",
    PAYMENT_FAILED: "payment_failed",
    CHECKOUT_EXPIRED: "checkout_expired",
    CONFLICT: "conflict",
    PLAN_REQUIRED: "subscription_required",
    FORBIDDEN: "insufficient_scope",
    LIMIT_REACHED: "rate_limited",
    ORDER_LIMIT: "order_limit",
  };
  const shopError = (err: unknown): never => {
    if (err instanceof ShopError) {
      throw new ExternalApiError(err.statusCode, SHOP_ERROR_CODES[err.code], err.message);
    }
    throw err;
  };

  const productQuery = z.object({ q: z.string().trim().max(120).optional() });
  server.get<{ Params: AgentParams; Querystring: z.infer<typeof productQuery> }>(
    "/:agentId/shop/products",
    { schema: { params: agentParams, querystring: productQuery } },
    (request) => agentSearchProducts(request.user.orgId, request.query.q).catch(shopError),
  );

  const checkoutBody = z.object({
    phone: phoneField,
    items: z
      .array(
        z.object({
          variant_id: z.string().uuid(),
          quantity: z.coerce.number().int().min(1).max(99),
        }),
      )
      .min(1)
      .max(20),
    coupon_code: z.string().trim().max(32).optional(),
  });
  server.post<{ Params: AgentParams; Body: z.infer<typeof checkoutBody> }>(
    "/:agentId/shop/checkout",
    { schema: { params: agentParams, body: checkoutBody } },
    async (request) => {
      const agent = await prisma.metaBusinessAgent.findUnique({
        where: { id: request.params.agentId },
        select: { whatsappSettings: { select: { phoneId: true } } },
      });
      return agentStartCheckout(
        request.user.orgId,
        request.body.phone,
        request.body.items,
        request.body.coupon_code,
        agent?.whatsappSettings.phoneId ?? null,
      ).catch(shopError);
    },
  );

  server.get<{ Params: AgentParams; Querystring: z.infer<typeof phoneQuery> }>(
    "/:agentId/shop/orders",
    { schema: { params: agentParams, querystring: phoneQuery } },
    (request) => agentOrderStatus(request.user.orgId, request.query.phone).catch(shopError),
  );

  const backInStockBody = z.object({ phone: phoneField, variant_id: z.string().uuid() });
  server.post<{ Params: AgentParams; Body: z.infer<typeof backInStockBody> }>(
    "/:agentId/shop/back-in-stock",
    { schema: { params: agentParams, body: backInStockBody } },
    (request) =>
      agentBackInStock(request.user.orgId, request.body.phone, request.body.variant_id).catch(
        shopError,
      ),
  );
}
