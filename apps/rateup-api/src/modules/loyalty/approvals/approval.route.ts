import { FastifyInstance } from "fastify";
import {
  createApprovalRequestHandler,
  getApprovalRequestsHandler,
  getApprovalRequestByIdHandler,
  approveApprovalRequestHandler,
  rejectApprovalRequestHandler,
  cancelApprovalRequestHandler,
} from "./approval.controller.js";
import {
  createApprovalRequestSchema,
  getApprovalRequestsSchema,
  approvalIdParamSchema,
  reviewRequestSchema,
  expireRequestSchema,
  cancelRequestSchema,
} from "./approval.schema.js";

export async function approvalRoutes(server: FastifyInstance) {
  // Create a new approval request
  server.post(
    "/",
    {
      schema: {
        body: createApprovalRequestSchema,
      },
    },
    createApprovalRequestHandler,
  );

  // Get all approval requests with filters
  server.get(
    "/",
    {
      schema: {
        querystring: getApprovalRequestsSchema,
      },
    },
    getApprovalRequestsHandler,
  );

  // Get a single approval request by ID
  server.get(
    "/:approvalId",
    {
      schema: {
        params: approvalIdParamSchema,
      },
    },
    getApprovalRequestByIdHandler,
  );

  // Approve an approval request
  server.post(
    "/:approvalId/approve",
    {
      schema: {
        params: approvalIdParamSchema,
        body: reviewRequestSchema,
      },
    },
    approveApprovalRequestHandler,
  );

  // Reject an approval request
  server.post(
    "/:approvalId/reject",
    {
      schema: {
        params: approvalIdParamSchema,
        body: expireRequestSchema,
      },
    },
    rejectApprovalRequestHandler,
  );

  // Cancel an approval request
  server.post(
    "/:approvalId/cancel",
    {
      schema: {
        params: approvalIdParamSchema,
        body: cancelRequestSchema,
      },
    },
    cancelApprovalRequestHandler,
  );
}
