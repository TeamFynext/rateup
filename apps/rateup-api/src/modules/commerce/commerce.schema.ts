import z from "zod";
import { spreadsheetExportFormatSchema } from "../../utils/spreadsheet.js";

/**
 * Shared filter accepted by every commerce dashboard endpoint.
 *
 * "Channel" on the commerce dashboard means the storefront an order came
 * through: either a connected WhatsApp number (`phoneId`) or, when the caller
 * already knows it, the catalog behind that number (`catalogId`). `phoneId` is
 * resolved to its catalog via CatalogPhoneIdMap. Omitting both means "all
 * channels in the org".
 */
export const commerceFilterSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  catalogId: z.string().optional(),
  phoneId: z.string().optional(),
});
export type CommerceFilter = z.infer<typeof commerceFilterSchema>;

export const commerceOrdersQuerySchema = commerceFilterSchema.extend({
  page: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(200).default(20),
  status: z.string().optional(),
  orderStage: z.string().optional(),
  paymentStatus: z.string().optional(),
  storeType: z.string().optional(),
  search: z.string().optional(),
});
export type CommerceOrdersQuery = z.infer<typeof commerceOrdersQuerySchema>;

export const commerceTimeseriesQuerySchema = commerceFilterSchema.extend({
  interval: z.enum(["day", "week", "month"]).default("day"),
});
export type CommerceTimeseriesQuery = z.infer<typeof commerceTimeseriesQuerySchema>;

export const commerceTopProductsQuerySchema = commerceFilterSchema.extend({
  limit: z.coerce.number().min(1).max(50).default(5),
});
export type CommerceTopProductsQuery = z.infer<typeof commerceTopProductsQuerySchema>;

/** Exports reuse the page's own filters so the file matches what's on screen. */
export const exportOrdersSchema = commerceOrdersQuerySchema
  .omit({ page: true, limit: true })
  .extend({ format: spreadsheetExportFormatSchema.default("xlsx") });
export type ExportOrdersInput = z.infer<typeof exportOrdersSchema>;

export const exportOverviewSchema = commerceFilterSchema.extend({
  format: spreadsheetExportFormatSchema.default("xlsx"),
  interval: z.enum(["day", "week", "month"]).default("day"),
  // The top-products limit, so the sheet matches the widget. The handler used to
  // hard-code 20 while the on-screen widget defaults to 5 — which contradicted
  // this file's own comment above. Same bounds as the widget's own schema.
  // See issues.txt 19.11.
  limit: z.coerce.number().min(1).max(50).default(5),
});
export type ExportOverviewInput = z.infer<typeof exportOverviewSchema>;
