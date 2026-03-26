import { z } from "zod";
import { MenuItemPriceType } from "../../../types/enums.js";

const CreateMenuItemInput = {
  name: z.string(),
  description: z.string(),
  price: z
    .union([
      z.object({
        price: z.string(),
        type: z.enum(MenuItemPriceType),
      }),
      z.object({
        type: z.enum(MenuItemPriceType),
        variants: z.array(
          z.object({
            name: z.string(),
            price: z.string(),
          }),
        ),
      }),
    ])
    .optional(),
  images: z.array(z.string()),
  categoryId: z.string(),
  videoUrl: z.string().optional(),
  foodLabels: z.array(z.string()).optional(),
  unsplashImage: z.array(z.string()).optional(),
};
const createMenuItemInputSchema = z.object(CreateMenuItemInput);

const updateMenuItemInputSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z
    .union([
      z.object({
        price: z.string(),
      }),
      z.object({
        variants: z.array(
          z.object({
            name: z.string(),
            price: z.string(),
          }),
        ),
      }),
    ])
    .optional(),
  images: z.array(z.string()).optional(),
  videoUrl: z.string().optional().optional(),
  itemOrder: z.string().optional(),
  disabled: z.boolean().optional(),
  foodLabels: z.array(z.string()).optional(),
});
const ByMenuItemIdParamsSchema = z.object({
  menuItemId: z.string(),
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemInputSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemInputSchema>;
export type ByMenuItemIdParams = z.infer<typeof ByMenuItemIdParamsSchema>;

// Auto-exported after fastify-zod migration
export {
  createMenuItemInputSchema,
  updateMenuItemInputSchema,
  ByMenuItemIdParamsSchema,
};
