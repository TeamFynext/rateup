import { z } from "zod";

import { PipelineType } from "../../../generated/prisma/client.js";
import { spreadsheetExportFormatSchema } from "../../utils/spreadsheet.js";
import { listLeadsQuerySchema } from "./pipelineLead/lead.schema.js";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected a #rrggbb colour");

export const idParamsSchema = z.object({
  id: z.uuid(),
});

export const createPipelineRequestSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(PipelineType).optional(),
  description: z.string().max(500).optional(),
  teamIds: z.array(z.uuid()).min(1),
});

export const updatePipelineRequestSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullish(),
  teamIds: z.array(z.uuid()).min(1).optional(),
  rottingEnabled: z.boolean().optional(),
  autoAssignEnabled: z.boolean().optional(),
  nudgeEnabled: z.boolean().optional(),
});

export const updateTeamDefaultRequestSchema = z
  .object({
    /** `null` clears the team's default board. */
    defaultPipelineId: z.uuid().nullable().optional(),
    autoCreateLeads: z.boolean().optional(),
  })
  .refine((value) => value.defaultPipelineId !== undefined || value.autoCreateLeads !== undefined, {
    message: "Provide at least one field to update",
  });

export const teamIdParamSchema = z.object({ teamId: z.uuid() });

export const createLostReasonRequestSchema = z.object({
  label: z.string().min(1).max(120),
});

export const updateLostReasonRequestSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  order: z.number().int().min(0).optional(),
});

export const createLabelRequestSchema = z.object({
  name: z.string().min(1).max(60),
  color: hexColor,
});

export const updateLabelRequestSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  color: hexColor.optional(),
});

export const importTemplateQuerySchema = z.object({
  format: z.enum(["csv", "xlsx"]).default("xlsx"),
});
export type ImportTemplateQuerySchema = z.infer<typeof importTemplateQuerySchema>;

/** The board's own filters, so an export holds what the board shows, plus the file format. */
export const exportLeadsQuerySchema = listLeadsQuerySchema
  .omit({ pipelineId: true, cursor: true, limit: true })
  .extend({ format: spreadsheetExportFormatSchema.default("xlsx") });
export type ExportLeadsQuerySchema = z.infer<typeof exportLeadsQuerySchema>;

export type CreatePipelineRequestSchema = z.infer<typeof createPipelineRequestSchema>;
export type UpdatePipelineRequestSchema = z.infer<typeof updatePipelineRequestSchema>;
export type UpdateTeamDefaultRequestSchema = z.infer<typeof updateTeamDefaultRequestSchema>;
export type CreateLostReasonRequestSchema = z.infer<typeof createLostReasonRequestSchema>;
export type UpdateLostReasonRequestSchema = z.infer<typeof updateLostReasonRequestSchema>;
export type CreateLabelRequestSchema = z.infer<typeof createLabelRequestSchema>;
export type UpdateLabelRequestSchema = z.infer<typeof updateLabelRequestSchema>;
