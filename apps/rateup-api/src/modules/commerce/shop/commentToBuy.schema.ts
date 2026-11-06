import { z } from "zod";

/** The value of a SEND_SHOP_PRODUCTS rule action. Mirrored in rateup-ui's automation editor. */
export const shopProductsActionSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(10),
  message: z.string().trim().max(600).optional(),
  /** Sell only this many, one per commenter, first come. */
  dropLimit: z.number().int().min(1).max(100_000).nullish(),
});
export type ShopProductsAction = z.infer<typeof shopProductsActionSchema>;
