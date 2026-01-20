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
        description: "Create a new approval request",
        tags: ["Approval Requests"],
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
        description: "Get approval requests with filters",
        tags: ["Approval Requests"],
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
        description: "Get a single approval request by ID",
        tags: ["Approval Requests"],
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
        description: "Approve an approval request",
        tags: ["Approval Requests"],
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
        description: "Reject an approval request",
        tags: ["Approval Requests"],
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
        description: "Cancel an approval request",
        tags: ["Approval Requests"],
      },
    },
    cancelApprovalRequestHandler,
  );
}
