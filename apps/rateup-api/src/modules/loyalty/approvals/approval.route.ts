import { FastifyInstance } from "fastify";
import {
  createApprovalRequestHandler,
  getApprovalRequestsHandler,
  getApprovalRequestByIdHandler,
  approveApprovalRequestHandler,
  rejectApprovalRequestHandler,
  cancelApprovalRequestHandler,
} from "./approval.controller.js";
import { $approvalRef } from "./approval.schema.js";

export async function approvalRoutes(server: FastifyInstance) {
  // Create a new approval request
  server.post(
    "/",
    {
      schema: {
        body: $approvalRef("createApprovalRequestSchema"),
      },
    },
    createApprovalRequestHandler,
  );

  // Get all approval requests with filters
  server.get(
    "/",
    {
      schema: {
        querystring: $approvalRef("getApprovalRequestsSchema"),
      },
    },
    getApprovalRequestsHandler,
  );

  // Get a single approval request by ID
  server.get(
    "/:approvalId",
    {
      schema: {
        params: $approvalRef("approvalIdParamSchema"),
      },
    },
    getApprovalRequestByIdHandler,
  );

  // Approve an approval request
  server.post(
    "/:approvalId/approve",
    {
      schema: {
        params: $approvalRef("approvalIdParamSchema"),
        body: {
          type: "object",
          properties: {
            reviewerId: { type: "string", format: "uuid" },
            reviewerName: { type: "string" },
            notes: { type: "string" },
          },
          required: ["reviewerId", "reviewerName"],
        },
      },
    },
    approveApprovalRequestHandler,
  );

  // Reject an approval request
  server.post(
    "/:approvalId/reject",
    {
      schema: {
        params: $approvalRef("approvalIdParamSchema"),
        body: {
          type: "object",
          properties: {
            reviewerId: { type: "string", format: "uuid" },
            reviewerName: { type: "string" },
            reason: { type: "string" },
          },
          required: ["reviewerId", "reviewerName", "reason"],
        },
      },
    },
    rejectApprovalRequestHandler,
  );

  // Cancel an approval request
  server.post(
    "/:approvalId/cancel",
    {
      schema: {
        params: $approvalRef("approvalIdParamSchema"),
        body: {
          type: "object",
          properties: {
            reason: { type: "string" },
          },
          required: ["reason"],
        },
      },
    },
    cancelApprovalRequestHandler,
  );
}
