import z from "zod";

/**
 * GetLead keys are prefixed `ik_`. Checked here so an obviously wrong paste — a
 * URL, a Zoho token — is rejected before it costs a round trip.
 */
const getleadConnectSchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(1, "An API key is required")
    .startsWith("ik_", "A GetLead API key starts with ik_"),
  /** Only for pointing a local build at a non-production GetLead. */
  baseUrl: z.url().optional(),
});

const getleadMetaQuerySchema = z.object({
  /** Bypasses the cache and re-reads GET /meta. */
  refresh: z.coerce.boolean().optional(),
});

/**
 * One board column mapped onto a GetLead status.
 *
 * A column the org wants unmapped is simply absent from the array rather than
 * present with an empty status — `resolveGetLeadStatusId` treats "no entry" as
 * "push no status", and an entry with a blank id would be a mapping to nothing.
 */
const getleadStageMappingSchema = z.object({
  stageId: z.uuid(),
  stageName: z.string().optional(),
  getleadStatusId: z.string().min(1),
  getleadStatusName: z.string().optional(),
});

const getleadSettingsSchema = z.object({
  stageMappings: z.array(getleadStageMappingSchema).max(100).optional(),
  defaults: z
    .object({
      sourceId: z.string().optional(),
      statusId: z.string().optional(),
      // GetLead caps a lead at 5 purposes' worth of reference data; the array
      // itself is unbounded but a default of more than a handful is a mistake.
      purposeIds: z.array(z.string()).max(20).optional(),
      assignedToId: z.string().optional(),
    })
    .optional(),
  triggerSubscriptions: z
    .array(z.object({ subscribed_field: z.string(), active: z.boolean() }))
    .optional(),
});

export type GetLeadConnectBody = z.infer<typeof getleadConnectSchema>;
export type GetLeadMetaQuery = z.infer<typeof getleadMetaQuerySchema>;
export type GetLeadSettingsBody = z.infer<typeof getleadSettingsSchema>;

export { getleadConnectSchema, getleadMetaQuerySchema, getleadSettingsSchema };
