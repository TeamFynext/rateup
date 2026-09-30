import z from "zod";
import { ShopifyEvents } from "../../../types/enums.js";

const byIdParamsSchema = z.object({
  id: z.string(),
});
const byShopParamsSchema = z.object({
  shop: z.string(),
});

const registerWebhookbyTopicSchema = z.object({
  topic: z.enum(ShopifyEvents),
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** A results period; defaults to the last 30 days and is capped at a year. */
const attributionQuerySchema = z
  .object({
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
  })
  .transform(({ from, to }) => {
    const end = to ? new Date(to) : new Date();
    const start = from ? new Date(from) : new Date(end.getTime() - 30 * DAY_MS);
    return { from: start, to: end };
  })
  .refine(({ from, to }) => from < to && to.getTime() - from.getTime() <= 366 * DAY_MS, {
    message: "The period must run forwards and be at most a year",
  });

export type IdParamInput = z.infer<typeof byIdParamsSchema>;
export type AttributionQuery = z.infer<typeof attributionQuerySchema>;
export type ShopParamInput = z.infer<typeof byShopParamsSchema>;
export type registerWebhookbyTopicInput = z.infer<typeof registerWebhookbyTopicSchema>;

// Auto-exported after fastify-zod migration
export {
  attributionQuerySchema,
  byIdParamsSchema,
  byShopParamsSchema,
  registerWebhookbyTopicSchema,
};
