import { z } from "zod";

const sourceQuery = z.object({
  source: z.enum(["wa", "db"]).default("wa"),
  // Flow ids are scoped to a WABA at Meta, so callers that will use a flow on one
  // number (a template's FLOW button, say) ask for that number's flows only.
  whatsappSettingsPhoneId: z.string().optional(),
});

const byWhatsappSettingsPhoneQuery = z.object({
  whatsappSettingsPhoneId: z.string().optional(),
});

const byWaFlowIdParams = z.object({
  waFlowId: z.string(),
});
const byDbFlowIdParams = z.object({
  dbFlowId: z.string(),
});

const importFlowsBody = z.object({
  waFlowIds: z.array(z.string()),
  mapData: z.any(), // TODO: add types
  teamIds: z.array(z.string()),
  /** Number the flows being imported live on; the org default channel when omitted. */
  whatsappSettingsPhoneId: z.string().optional(),
});
const createFlowInput = z.object({
  teamIds: z.array(z.string()),
  name: z.string(),
  /** Meta's categories plus RateUp's own (LOYALTY_FEEDBACK); stored as given, mapped for Meta. */
  categories: z.array(z.string()),
  json: z.any().optional(),
  map: z.any().optional(),
  /** A ready-made flow from `flowTemplates.ts` to start from; takes precedence over `json`. */
  templateKey: z.string().optional(),
  /** Number to create the flow on; the org default channel when omitted. */
  whatsappSettingsPhoneId: z.string().optional(),
});

const templatesQuery = z.object({
  /** The category the templates are for, e.g. LOYALTY_FEEDBACK. */
  category: z.string().min(1),
});

const isFlowJson = (value: unknown): value is WaFlowJson =>
  typeof value === "object" && value !== null && Array.isArray((value as WaFlowJson).screens);

const flowTemplatesResponse = z.object({
  templates: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      description: z.string(),
      questions: z.array(z.object({ title: z.string(), kind: z.enum(["rating", "text"]) })),
      /** v2 WaFlow JSON, renderable by the UI's flow preview without the editor. */
      previewJson: z.custom<WaFlowJson>(isFlowJson),
    }),
  ),
  /** The template to preselect for this org, when the category has a sensible guess. */
  suggestedKey: z.string().nullable(),
});

const updateFlowInput = z.object({
  name: z.string().trim().optional(),
  status: z.string().optional(),
  json: z.any().optional(),
  map: z.any().optional(),
  logicJumps: z.any().optional(),
  templateMessage: z.custom<WaFlowTemplateMessage>().optional(),
  startMessageConfig: z.custom<WaFlowStartMessageConfig>().optional(),
  pendingSave: z.boolean().optional(),
  anonymous: z.boolean().optional(),
});
const updateFlowMetaInput = z.object({
  name: z.string().optional(),
  // categories: z.array(z.string()).optional(),
  anonymous: z.boolean().optional(),
});

const cloneFlowSchema = z.object({
  teamId: z.uuid(),
});

const sendFlowBodySchema = z.object({
  phone: z.string(),
  teamId: z.string(),
  flowId: z.string(),
  whatsappSettingsPhoneId: z.string().optional(),
});

export type WaFlowSourceQuery = z.infer<typeof sourceQuery>;
export type WaFlowChannelQuery = z.infer<typeof byWhatsappSettingsPhoneQuery>;
export type ByWaFlowIdParams = z.infer<typeof byWaFlowIdParams>;
export type ImportFlowsBody = z.infer<typeof importFlowsBody>;
export type CreateFlowInput = z.infer<typeof createFlowInput>;
export type ByDbFlowIdParams = z.infer<typeof byDbFlowIdParams>;
export type UpdateFlowInput = z.infer<typeof updateFlowInput>;
export type CloneFlowBody = z.infer<typeof cloneFlowSchema>;
export type SendFlowBody = z.infer<typeof sendFlowBodySchema>;
export type UpdateFlowMetaInput = z.infer<typeof updateFlowMetaInput>;
export type FlowTemplatesQuery = z.infer<typeof templatesQuery>;
export type FlowTemplatesResponse = z.infer<typeof flowTemplatesResponse>;

// Auto-exported after fastify-zod migration
export {
  sourceQuery,
  templatesQuery,
  flowTemplatesResponse,
  byWhatsappSettingsPhoneQuery,
  byWaFlowIdParams,
  importFlowsBody,
  createFlowInput,
  byDbFlowIdParams,
  updateFlowInput,
  cloneFlowSchema,
  sendFlowBodySchema,
  updateFlowMetaInput,
};
