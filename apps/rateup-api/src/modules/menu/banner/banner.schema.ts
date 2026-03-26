import { z } from "zod";
import { MenuItemPriceType } from "../../../types/enums.js";

const MenuItemVariant = z.object({
  name: z.string(),
  price: z.string(),
});
const CreateMenuBannerInput = {
  name: z.string(),
  description: z.string(),
  price: z
    .union([
      z
        .object({
          price: z.string().optional(),
          type: z.enum(MenuItemPriceType).optional(),
          variants: z.array(MenuItemVariant).optional(),
        })
        .optional(),
      z
        .object({
          type: z.enum(MenuItemPriceType).optional(),
          variants: z.array(MenuItemVariant).optional(),
          price: z.string().optional(),
        })
        .optional(),
    ])
    .optional(),
  image: z.string().optional(),
  menuId: z.string(),
  videoUrl: z.string().optional(),
  foodLabels: z.array(z.string()).optional(),
};
const createMenuBannerInputSchema = z.object(CreateMenuBannerInput);

const ByMenuBannerIdParamsSchema = z.object({
  menuBannerId: z.string(),
});

export type CreateMenuBannerInput = z.infer<typeof createMenuBannerInputSchema>;
export type ByMenuBannerIdParams = z.infer<typeof ByMenuBannerIdParamsSchema>;

// Auto-exported after fastify-zod migration
export { createMenuBannerInputSchema, ByMenuBannerIdParamsSchema };
