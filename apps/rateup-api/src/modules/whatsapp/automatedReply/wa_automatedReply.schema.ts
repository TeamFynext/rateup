import { z } from "zod";

/**
 * One React Flow node of a flow-builder automation. The client saves `toObject()` as is, so
 * React Flow's own fields (measured, selected, …) ride along: the object is loose, but the
 * fields the flow-runner reads are typed.
 */
const automationNodeSchema = z.looseObject({
  id: z.string().min(1).max(200),
  type: z.string().max(100).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

const automationEdgeSchema = z.looseObject({
  id: z.string().max(400).optional(),
  source: z.string().min(1).max(200),
  target: z.string().min(1).max(200),
  sourceHandle: z.string().max(200).nullish(),
  targetHandle: z.string().max(200).nullish(),
});

/** `WaAutomatedReplyMatchData.json`: the node/edge graph (AutomationGraph) plus the canvas viewport. */
export const automationGraphSchema = z.object({
  nodes: z.array(automationNodeSchema).max(1000).default([]),
  edges: z.array(automationEdgeSchema).max(5000).default([]),
  viewport: z
    .object({
      x: z.number().optional(),
      y: z.number().optional(),
      zoom: z.number().optional(),
    })
    .optional(),
});

const contactFiltersSchema = z.object({
  newContactsOnly: z.boolean().optional(),
  inGroups: z.array(z.string().max(100)).max(500).optional(),
  requiredFieldsWithAnyValue: z.array(z.string().max(100)).max(500).optional(),
});

/** Mirrors the global `WaAutomatedReplyMatchData`; keys outside it are dropped. */
export const matchDataSchema = z.object({
  keywords: z.array(z.string().max(1000)).max(500).optional(),
  exactText: z.string().max(4096).optional(),
  caseSensitive: z.boolean().optional(),
  contactFilters: contactFiltersSchema.optional(),
  json: automationGraphSchema.optional(),
});

const createAutomatedReplySchema = z.object({
  name: z.string().trim().min(1).max(200),
  matchData: matchDataSchema,
  whatsappSettingsPhoneId: z.string().max(100).nullish(),
  // Lowercase from the client ("whatsapp" | "instagram" | "facebook"); see automationPlatform.
  platform: z.string().max(32).optional(),
});

/**
 * Updates are partial: the flow editor resends the whole row it loaded (id, createdAt, …),
 * which the object strips, and a rename can omit matchData.
 */
const updateAutomatedReplySchema = createAutomatedReplySchema.partial();

const byWaAutomatedReplyIdParams = z.object({
  waAutomatedReplyId: z.string(),
});

const cloneAutomatedReplyBody = z.object({
  name: z.string().min(1).optional(),
});

const initiateAutomatedReplyBody = z.object({
  // A phone number, or a WhatsApp business-scoped user ID ("US.1349…", up to
  // ~135 characters) for a customer whose phone Meta withholds.
  phone: z.string().trim().min(1).max(160),
});

export type CreateAutomatedReplySchema = z.infer<typeof createAutomatedReplySchema>;
export type UpdateAutomatedReplySchema = z.infer<typeof updateAutomatedReplySchema>;
export type ByWaAutomatedReplyIdParams = z.infer<typeof byWaAutomatedReplyIdParams>;
export type CloneAutomatedReplyBody = z.infer<typeof cloneAutomatedReplyBody>;
export type InitiateAutomatedReplyBody = z.infer<typeof initiateAutomatedReplyBody>;

// Auto-exported after fastify-zod migration
export {
  createAutomatedReplySchema,
  updateAutomatedReplySchema,
  byWaAutomatedReplyIdParams,
  cloneAutomatedReplyBody,
  initiateAutomatedReplyBody,
};
