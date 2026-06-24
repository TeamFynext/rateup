/**
 * Instagram Automated Reply Controller
 * HTTP handlers for Instagram automation endpoints
 * Isolated from WhatsApp to prevent cross-platform interference
 */

import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../../utils/logger.js";
import {
  getInstagramAutomatedRepliesByOrgId,
  getInstagramAutomatedReplyById,
  createInstagramAutomatedReply,
  updateInstagramAutomatedReply,
  deleteInstagramAutomatedReply,
} from "./instagram_automatedReply.service.js";
import { startInstagramAutomationFlow } from "./instagram_automation.service.js";

/**
 * Get all Instagram automations for an organization
 */
export async function getInstagramAutomationsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { orgId } = request.user as any;

    const automations = await getInstagramAutomatedRepliesByOrgId(orgId);

    reply.code(200).send({
      success: true,
      data: automations,
    });
  } catch (error) {
    log.error(`[Instagram Automation Controller] Error getting automations: %o`, error);
    reply.code(500).send({
      success: false,
      error: "Failed to fetch Instagram automations",
    });
  }
}

/**
 * Get Instagram automation by ID
 */
export async function getInstagramAutomationByIdHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user as any;
    const { id } = request.params;

    const automation = await getInstagramAutomatedReplyById(id);

    if (!automation) {
      return reply.code(404).send({
        success: false,
        error: "Instagram automation not found",
      });
    }

    // Verify ownership
    if (automation.orgId !== orgId) {
      return reply.code(403).send({
        success: false,
        error: "Unauthorized access to this automation",
      });
    }

    reply.code(200).send({
      success: true,
      data: automation,
    });
  } catch (error) {
    log.error(`[Instagram Automation Controller] Error getting automation: %o`, error);
    reply.code(500).send({
      success: false,
      error: "Failed to fetch Instagram automation",
    });
  }
}

/**
 * Create a new Instagram automation
 */
export async function createInstagramAutomationHandler(
  request: FastifyRequest<{
    Body: {
      name: string;
      matchData: any;
      whatsappSettingsPhoneId?: string;
      sendOnceIn24Hours?: boolean;
      isActive?: boolean;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user as any;
    const body = request.body;

    const automation = await createInstagramAutomatedReply({
      orgId,
      name: body.name,
      matchData: body.matchData,
      whatsappSettingsPhoneId: body.whatsappSettingsPhoneId,
      sendOnceIn24Hours: body.sendOnceIn24Hours,
      isActive: body.isActive,
    });

    log.info(`[Instagram Automation Controller] Created automation ${automation.id}`);

    reply.code(201).send({
      success: true,
      data: automation,
    });
  } catch (error) {
    log.error(`[Instagram Automation Controller] Error creating automation: %o`, error);
    reply.code(500).send({
      success: false,
      error: "Failed to create Instagram automation",
    });
  }
}

/**
 * Update an Instagram automation
 */
export async function updateInstagramAutomationHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      name?: string;
      matchData?: any;
      whatsappSettingsPhoneId?: string;
      sendOnceIn24Hours?: boolean;
      isActive?: boolean;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user as any;
    const { id } = request.params;
    const body = request.body;

    // Verify automation exists and belongs to org
    const existing = await getInstagramAutomatedReplyById(id);
    if (!existing) {
      return reply.code(404).send({
        success: false,
        error: "Instagram automation not found",
      });
    }

    if (existing.orgId !== orgId) {
      return reply.code(403).send({
        success: false,
        error: "Unauthorized access to this automation",
      });
    }

    const automation = await updateInstagramAutomatedReply(id, body);

    log.info(`[Instagram Automation Controller] Updated automation ${id}`);

    reply.code(200).send({
      success: true,
      data: automation,
    });
  } catch (error) {
    log.error(`[Instagram Automation Controller] Error updating automation: %o`, error);
    reply.code(500).send({
      success: false,
      error: "Failed to update Instagram automation",
    });
  }
}

/**
 * Delete an Instagram automation
 */
export async function deleteInstagramAutomationHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user as any;
    const { id } = request.params;

    // Verify automation exists and belongs to org
    const existing = await getInstagramAutomatedReplyById(id);
    if (!existing) {
      return reply.code(404).send({
        success: false,
        error: "Instagram automation not found",
      });
    }

    if (existing.orgId !== orgId) {
      return reply.code(403).send({
        success: false,
        error: "Unauthorized access to this automation",
      });
    }

    await deleteInstagramAutomatedReply(id);

    log.info(`[Instagram Automation Controller] Deleted automation ${id}`);

    reply.code(200).send({
      success: true,
      message: "Instagram automation deleted successfully",
    });
  } catch (error) {
    log.error(`[Instagram Automation Controller] Error deleting automation: %o`, error);
    reply.code(500).send({
      success: false,
      error: "Failed to delete Instagram automation",
    });
  }
}

/**
 * Manually trigger an Instagram automation for a specific user
 */
export async function initiateInstagramAutomationHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      igsId: string; // Instagram Scoped ID
      ibaId: string; // Instagram Business Account ID
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user as any;
    const { id } = request.params;
    const { igsId, ibaId } = request.body;

    // Get automation
    const automation = await getInstagramAutomatedReplyById(id);
    if (!automation) {
      return reply.code(404).send({
        success: false,
        error: "Instagram automation not found",
      });
    }

    if (automation.orgId !== orgId) {
      return reply.code(403).send({
        success: false,
        error: "Unauthorized access to this automation",
      });
    }

    // Start the automation flow
    await startInstagramAutomationFlow(igsId, automation as any, orgId, ibaId);

    log.info(
      `[Instagram Automation Controller] Manually triggered automation ${id} for igsId ${igsId}`,
    );

    reply.code(200).send({
      success: true,
      message: "Instagram automation initiated successfully",
    });
  } catch (error) {
    log.error(`[Instagram Automation Controller] Error initiating automation: %o`, error);
    reply.code(500).send({
      success: false,
      error: "Failed to initiate Instagram automation",
    });
  }
}
