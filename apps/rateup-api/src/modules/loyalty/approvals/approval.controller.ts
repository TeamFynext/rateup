import { FastifyReply, FastifyRequest } from "fastify";
import {
  createApprovalRequest,
  getApprovalRequests,
  getApprovalRequestById,
  approveApprovalRequest,
  rejectApprovalRequest,
  cancelApprovalRequest,
} from "./approval.service.js";
import {
  CreateApprovalRequestInput,
  GetApprovalRequestsInput,
  ApprovalIdParam,
  ApproveRequestInput,
  RejectRequestInput,
  CancelRequestInput,
} from "./approval.schema.js";
import { log } from "../../../utils/logger.js";
import { getLoyaltyProgramByOrg } from "../program/program.service.js";

/**
 * Create a new approval request
 * POST /loyalty/approvals
 */
export async function createApprovalRequestHandler(
  request: FastifyRequest<{ Body: CreateApprovalRequestInput }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      return reply.code(404).send({ error: "Loyalty program not found" });
    }

    const result = await createApprovalRequest(request.body);
    reply.code(201).send(result);
  } catch (e: any) {
    log.error({ err: e }, "Error creating approval request:");
    reply.code(500).send({ error: e.message });
  }
}

/**
 * Get approval requests with filters
 * GET /loyalty/approvals
 */
export async function getApprovalRequestsHandler(
  request: FastifyRequest<{ Querystring: GetApprovalRequestsInput }>,
  reply: FastifyReply,
) {
  try {
    const program = await getLoyaltyProgramByOrg(request.user.orgId);
    if (!program) {
      // if no program, return empty array to avoid 404s on frontend which expects an array in (all data get case)
      return reply.code(200).send([]);
    }

    const result = await getApprovalRequests(program.id, request.query);
    reply.code(200).send(result);
  } catch (e: any) {
    log.error({ err: e }, "Error getting approval requests:");
    reply.code(500).send({ error: e.message });
  }
}

/**
 * Get a single approval request by ID
 * GET /loyalty/approvals/:approvalId
 */
export async function getApprovalRequestByIdHandler(
  request: FastifyRequest<{ Params: ApprovalIdParam }>,
  reply: FastifyReply,
) {
  try {
    const result = await getApprovalRequestById(request.params.approvalId);
    reply.code(200).send(result);
  } catch (e: any) {
    log.error({ err: e }, "Error getting approval request:");
    if (e.message === "Approval request not found") {
      return reply.code(404).send({ error: e.message });
    }
    reply.code(500).send({ error: e.message });
  }
}

/**
 * Approve an approval request
 * POST /loyalty/approvals/:approvalId/approve
 */
export async function approveApprovalRequestHandler(
  request: FastifyRequest<{
    Params: ApprovalIdParam;
    Body: Omit<ApproveRequestInput, "approvalId">;
  }>,
  reply: FastifyReply,
) {
  try {
    const data: ApproveRequestInput = {
      approvalId: request.params.approvalId,
      reviewerId: request.body.reviewerId,
      reviewerName: request.body.reviewerName,
      notes: request.body.notes,
    };

    const result = await approveApprovalRequest(data);
    reply.code(200).send(result);
  } catch (e: any) {
    log.error({ err: e }, "Error approving request:");
    reply.code(500).send({ error: e.message });
  }
}

/**
 * Reject an approval request
 * POST /loyalty/approvals/:approvalId/reject
 */
export async function rejectApprovalRequestHandler(
  request: FastifyRequest<{
    Params: ApprovalIdParam;
    Body: Omit<RejectRequestInput, "approvalId">;
  }>,
  reply: FastifyReply,
) {
  try {
    const data: RejectRequestInput = {
      approvalId: request.params.approvalId,
      reviewerId: request.body.reviewerId,
      reviewerName: request.body.reviewerName,
      reason: request.body.reason,
    };

    const result = await rejectApprovalRequest(data);
    reply.code(200).send(result);
  } catch (e: any) {
    log.error({ err: e }, "Error rejecting request:");
    reply.code(500).send({ error: e.message });
  }
}

/**
 * Cancel an approval request
 * POST /loyalty/approvals/:approvalId/cancel
 */
export async function cancelApprovalRequestHandler(
  request: FastifyRequest<{
    Params: ApprovalIdParam;
    Body: Omit<CancelRequestInput, "approvalId">;
  }>,
  reply: FastifyReply,
) {
  try {
    const data: CancelRequestInput = {
      approvalId: request.params.approvalId,
      reason: request.body.reason,
    };

    const result = await cancelApprovalRequest(data);
    reply.code(200).send(result);
  } catch (e: any) {
    log.error({ err: e }, "Error cancelling request:");
    reply.code(500).send({ error: e.message });
  }
}
