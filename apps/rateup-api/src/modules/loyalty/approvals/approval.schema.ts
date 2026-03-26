import { z } from "zod";

// Enums
export const ApprovalRequestTypeEnum = z.enum([
  "REWARD_REDEMPTION",
  "POINTS_ADJUSTMENT",
  "TIER_OVERRIDE",
  "ACCOUNT_SUSPENSION",
  "ACCOUNT_REACTIVATION",
  "BULK_OPERATION",
]);

export const ApprovalStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
]);

export const RequestedByTypeEnum = z.enum(["CUSTOMER", "STAFF", "SYSTEM"]);

// Request schemas
export const createApprovalRequestSchema = z.object({
  requestType: ApprovalRequestTypeEnum,
  accountId: z.uuid(),
  points: z.int().nullable().optional(),
  reason: z.string().min(1),
  requestData: z.record(z.string(), z.any()).optional().default({}),
  requestedBy: z.uuid().nullable().optional(),
  requestedByType: RequestedByTypeEnum.optional().default("CUSTOMER"),
  requestedByName: z.string().nullable().optional(),
  redemptionId: z.uuid().nullable().optional(),
  transactionId: z.uuid().nullable().optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
});

export const getApprovalRequestsSchema = z.object({
  status: ApprovalStatusEnum.optional(),
  requestType: ApprovalRequestTypeEnum.optional(),
  accountId: z.uuid().optional(),
  fromDate: z.iso.datetime().optional(),
  toDate: z.iso.datetime().optional(),
  page: z.int().min(1).optional().default(1),
  limit: z.int().min(1).max(100).optional().default(20),
});

export const approvalIdParamSchema = z.object({
  approvalId: z.uuid(),
});

export const approveRequestSchema = z.object({
  approvalId: z.uuid(),
  reviewerId: z.uuid(),
  reviewerName: z.string(),
  notes: z.string().optional(),
});

export const rejectRequestSchema = z.object({
  approvalId: z.uuid(),
  reviewerId: z.uuid(),
  reviewerName: z.string(),
  reason: z.string().min(1),
});
export const reviewRequestSchema = z.object({
  reviewerId: z.uuid(),
  reviewerName: z.string(),
  notes: z.string().optional(),
});

export const expireRequestSchema = z.object({
  reviewerId: z.uuid(),
  reviewerName: z.string(),
  reason: z.string().min(1),
});
export type ExpireRequestInput = z.infer<typeof expireRequestSchema>;
export const cancelRequestSchema = z.object({
  approvalId: z.uuid(),
  reason: z.string().min(1),
});

// Types
export type CreateApprovalRequestInput = z.infer<
  typeof createApprovalRequestSchema
>;
export type GetApprovalRequestsInput = z.infer<
  typeof getApprovalRequestsSchema
>;
export type ApprovalIdParam = z.infer<typeof approvalIdParamSchema>;
export type ApproveRequestInput = z.infer<typeof approveRequestSchema>;
export type RejectRequestInput = z.infer<typeof rejectRequestSchema>;
export type CancelRequestInput = z.infer<typeof cancelRequestSchema>;

// Build JSON schemas for Fastify
