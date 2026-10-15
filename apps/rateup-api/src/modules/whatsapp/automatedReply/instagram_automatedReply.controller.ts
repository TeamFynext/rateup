/**
 * HTTP handlers for the Meta chatbot flows. The same handlers serve Instagram
 * (`/instagram-automation`) and Messenger (`/messenger-automation`); each route
 * registration builds its own set bound to one platform.
 */

import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import {
  getMetaAutomationsByOrgId,
  getMetaAutomationById,
  createMetaAutomation,
  updateMetaAutomation,
  deleteMetaAutomation,
  cloneMetaAutomation,
  type MetaAutomationPlatform,
} from "./instagram_automatedReply.service.js";
import { startMetaFlow, type MetaFlowAutomation } from "./metaFlow.service.js";
import type { InitiateMetaAutomationBody } from "./instagram_automatedReply.schema.js";

const LABELS: Record<MetaAutomationPlatform, { name: string; log: string }> = {
  [PlatformType.INSTAGRAM]: {
    name: "Instagram automation",
    log: "[Instagram Automation Controller]",
  },
  [PlatformType.FACEBOOK]: {
    name: "Messenger automation",
    log: "[Messenger Automation Controller]",
  },
};

interface AutomationBody {
  name: string;
  matchData: WaAutomatedReplyMatchData;
  whatsappSettingsPhoneId?: string;
}

export function metaAutomationHandlers(platform: MetaAutomationPlatform) {
  const { name, log: prefix } = LABELS[platform];
  const notFound = (reply: FastifyReply) =>
    reply.code(404).send({ success: false, error: `${name} not found` });

  /** Get all automations for an organization */
  async function list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { orgId } = request.user;

      const automations = await getMetaAutomationsByOrgId(orgId, platform);

      reply.code(200).send({
        success: true,
        data: automations,
      });
    } catch (error) {
      log.error({ err: error }, `${prefix} Error getting automations`);
      reply.code(500).send({
        success: false,
        error: `Failed to fetch ${name}s`,
      });
    }
  }

  /** Get an automation by ID */
  async function getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { orgId } = request.user;
      const { id } = request.params;

      // Scoped to the caller's org: another org's id reads as not found.
      const automation = await getMetaAutomationById(id, orgId, platform);
      if (!automation) return notFound(reply);

      reply.code(200).send({
        success: true,
        data: automation,
      });
    } catch (error) {
      log.error({ err: error }, `${prefix} Error getting automation`);
      reply.code(500).send({
        success: false,
        error: `Failed to fetch ${name}`,
      });
    }
  }

  /** Create a new automation */
  async function create(request: FastifyRequest<{ Body: AutomationBody }>, reply: FastifyReply) {
    try {
      const { orgId } = request.user;
      const body = request.body;

      const automation = await createMetaAutomation(platform, {
        orgId,
        name: body.name,
        matchData: body.matchData,
        whatsappSettingsPhoneId: body.whatsappSettingsPhoneId,
      });

      log.info(`${prefix} Created automation ${automation.id}`);

      reply.code(201).send({
        success: true,
        data: automation,
      });
    } catch (error) {
      log.error({ err: error }, `${prefix} Error creating automation`);
      reply.code(500).send({
        success: false,
        error: `Failed to create ${name}`,
      });
    }
  }

  /** Update an automation */
  async function update(
    request: FastifyRequest<{ Params: { id: string }; Body: Partial<AutomationBody> }>,
    reply: FastifyReply,
  ) {
    try {
      const { orgId } = request.user;
      const { id } = request.params;

      const existing = await getMetaAutomationById(id, orgId, platform);
      if (!existing) return notFound(reply);

      const automation = await updateMetaAutomation(id, orgId, platform, request.body);

      log.info(`${prefix} Updated automation ${id}`);

      reply.code(200).send({
        success: true,
        data: automation,
      });
    } catch (error) {
      log.error({ err: error }, `${prefix} Error updating automation`);
      reply.code(500).send({
        success: false,
        error: `Failed to update ${name}`,
      });
    }
  }

  /** Delete an automation */
  async function remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { orgId } = request.user;
      const { id } = request.params;

      const existing = await getMetaAutomationById(id, orgId, platform);
      if (!existing) return notFound(reply);

      await deleteMetaAutomation(id, orgId, platform);

      log.info(`${prefix} Deleted automation ${id}`);

      reply.code(200).send({
        success: true,
        message: `${name} deleted successfully`,
      });
    } catch (error) {
      log.error({ err: error }, `${prefix} Error deleting automation`);
      reply.code(500).send({
        success: false,
        error: `Failed to delete ${name}`,
      });
    }
  }

  /** Manually start an automation for one recipient */
  async function initiate(
    request: FastifyRequest<{ Params: { id: string }; Body: InitiateMetaAutomationBody }>,
    reply: FastifyReply,
  ) {
    try {
      const { orgId } = request.user;
      const { id } = request.params;
      const { recipientId, accountId } = request.body;

      const automation = await getMetaAutomationById(id, orgId, platform);
      if (!automation?.orgId) return notFound(reply);

      await startMetaFlow(
        recipientId,
        // The stored matchData is typed loosely on the Prisma model; this reader
        // knows the row is a Meta flow graph.
        { ...automation, orgId: automation.orgId } as unknown as MetaFlowAutomation,
        orgId,
        { platform, accountId },
      );

      log.info(`${prefix} Manually triggered automation ${id} for ${recipientId}`);

      reply.code(200).send({
        success: true,
        message: `${name} initiated successfully`,
      });
    } catch (error) {
      log.error({ err: error }, `${prefix} Error initiating automation`);
      reply.code(500).send({
        success: false,
        error: `Failed to initiate ${name}`,
      });
    }
  }

  /** Copy an automation within the org */
  async function clone(
    request: FastifyRequest<{ Params: { id: string }; Body: { name?: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const { orgId } = request.user;
      const { id } = request.params;

      const automation = await cloneMetaAutomation(id, orgId, platform, request.body?.name);
      if (!automation) return notFound(reply);

      reply.code(201).send({
        success: true,
        data: automation,
      });
    } catch (error) {
      log.error({ err: error }, `${prefix} Error cloning automation`);
      reply.code(500).send({
        success: false,
        error: `Failed to clone ${name}`,
      });
    }
  }

  return { list, getById, create, update, remove, initiate, clone };
}
