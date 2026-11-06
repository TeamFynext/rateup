import bcrypt from "bcrypt";
import type { FastifyReply, FastifyRequest } from "fastify";

import { Role } from "../../../generated/prisma/client.js";
import { buildActor } from "../../../authz/actor.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { orgIdFromAutomationKey } from "./automation.keys.js";
import { AUTOMATION_PLATFORM_LABELS, type AutomationPlatform } from "./automation.platforms.js";

const NOT_AUTHORIZED = { message: "Not authorized", error: "Invalid API key" };

/**
 * The preHandler for a platform's routes: `Authorization: Bearer rk_…`, the org
 * read from the key, the key checked against the org's active integration for
 * this platform. Every refusal is the same 401, so a caller cannot tell a wrong
 * org from a wrong key. Never logs the key.
 */
export function automationKeyAuth(platform: AutomationPlatform) {
  const label = AUTOMATION_PLATFORM_LABELS[platform];

  return async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    const header = request.headers.authorization;
    const key = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
    const orgId = key ? orgIdFromAutomationKey(key) : null;
    if (!orgId) {
      log.warn({ url: request.url }, `${label} request without a valid API key`);
      return reply.code(401).send(NOT_AUTHORIZED);
    }

    const integration = await prisma.integration.findUnique({
      where: { orgid_integration_name_unique: { orgId, name: platform } },
      select: { active: true, credential: true },
    });
    const hash = (integration?.credential as { accessToken?: unknown } | null)?.accessToken;
    if (!integration?.active || typeof hash !== "string" || !(await bcrypt.compare(key, hash))) {
      log.warn({ orgId }, `${label} request with an API key that does not match`);
      return reply.code(401).send(NOT_AUTHORIZED);
    }

    request.user = { orgId, role: Role.SUPER_ADMIN };
    request.principal = { kind: "automation", platform, orgId, scopes: [] };
    request.actor = buildActor(request.principal);
  };
}
