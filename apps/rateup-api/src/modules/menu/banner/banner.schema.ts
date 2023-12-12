import { buildJsonSchemas } from "fastify-zod";
import { z } from "zod";
import { MenuItemPriceType } from "../../../types/enums";

const CreateMenuBannerInput = {
  name: z.string(),
  description: z.string(),
  price: z
    .union([
      z.object({
        price: z.string(),
        type: z.nativeEnum(MenuItemPriceType),
      }),
      z.object({
        type: z.nativeEnum(MenuItemPriceType),
        variants: z.array(
          z.object({
            name: z.string(),
            price: z.string(),
          })
        ),
      }),
    ])
    .optional(),
  image: z.string().optional(),
  menuId: z.string(),
  videoUrl: z.string().optional(),
};
const createMenuBannerInputSchema = z.object(CreateMenuBannerInput);

const ByMenuBannerIdParamsSchema = z.object({
  menuBannerId: z.string(),
});

export const { schemas: menuBannerSchemas, $ref: $MBref } = buildJsonSchemas(
  {
    createMenuBannerInputSchema,
    ByMenuBannerIdParamsSchema,
  },
  { $id: "menuBannerSchema" }
);

export type CreateMenuBannerInput = z.infer<typeof createMenuBannerInputSchema>;
export type ByMenuBannerIdParams = z.infer<typeof ByMenuBannerIdParamsSchema>;
