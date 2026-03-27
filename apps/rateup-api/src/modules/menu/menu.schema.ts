import { z } from "zod";
const menuInput = {
  name: z.string(),
  displayName: z.string(),
  locationText: z.string().optional(),
  locationUrl: z.string().optional(),
  websiteText: z.string().optional(),
  websiteUrl: z.string().optional(),
  logo: z.string().optional(),
  backgroundImage: z.string().optional(),
  teamId: z.string(),
  currency: z.string().optional(),
};

const updateMenuInputSchema = z.object({
  name: z.string().optional(),
  displayName: z.string().optional(),
  locationText: z.string().optional(),
  locationUrl: z.string().optional(),
  backgroundImage: z.string().optional(),
  surveyTeamMapId: z.string().optional(),
  isPublished: z.boolean().optional(),
  itemOrder: z.string().optional(),
  currency: z.string().optional(),
  teamId: z.string().optional(),
  hideUnavailableCategory: z.boolean().optional(),
  mobileBackgroundImage: z.string().optional(),
  logo: z.string().optional(),
  unsplashImage: z
    .object({
      mobileBackgroundImage: z.boolean().optional(),
      backgroundImage: z.boolean().optional(),
    })
    .optional()
    .nullable(),
  menuButtons: z
    .array(
      z
        .object({
          name: z.string(),
          link: z.string(),
        })
        .optional(),
    )
    .optional(),
  colors: z
    .object({
      primary: z.string(),
      seconday: z.string(),
    })
    .optional()
    .nullable(),
});
const menuInputSchema = z.object(menuInput);
const menuCore = {
  ...menuInput,
  id: z.string(),
  createdAt: z.string(),
};
const menuSchema = z.object(menuCore);
const ByMenuIdParamsSchema = z.object({
  menuId: z.string(),
});

const menuPublicResponseSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  locationText: z.string().optional(),
  locationUrl: z.string().optional(),
  isPublished: z.boolean().optional(),
});

const fullMenuPublicResponseSchema = z.object({
  ...menuPublicResponseSchema.shape,
  categories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      image: z.string().optional(),
      scheduleEnabled: z.boolean().optional(),
      startTime: z.date().optional(),
      endTime: z.date().optional(),
      items: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().optional(),
          images: z.array(z.string()).optional(),
          videoUrl: z.string().optional(),
          price: z.any(),
          disabled: z.boolean()?.optional(),
          foodLabels: z.array(z.string()).optional(),
          unsplashImage: z.array(z.string()).optional().nullable(),
        }),
      ),
    }),
  ),
  expiry: z.string().optional(),
  menuLanding: z
    .object({
      backgroundImage: z.string().optional().nullable(),
      mobileBackgroundImage: z.string().optional().nullable(),
      logo: z.string().optional().nullable(),
      surveyTeamMapId: z.string().optional().nullable(),
      menuButtons: z.array(
        z
          .object({
            name: z.string(),
            link: z.string(),
          })
          .optional(),
      ),
      menu: z.object({
        currency: z.string().optional(),
        hideUnavailableCategory: z.boolean().optional(),
      }),
      surveyTeamMap: z
        .object({
          shortUrlId: z.string().optional().nullable(),
        })
        .optional()
        .nullable(),
      unsplashImage: z
        .object({
          mobileBackgroundImage: z.boolean().optional(),
          backgroundImage: z.boolean().optional(),
        })
        .optional()
        .nullable(),
    })
    .nullable(),
});

export type CreateMenuInput = z.infer<typeof menuInputSchema>;
export type Menu = z.infer<typeof menuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuInputSchema>;
export type ByMenuIdParams = z.infer<typeof ByMenuIdParamsSchema>;

// Auto-exported after fastify-zod migration
export {
  menuInputSchema,
  menuSchema,
  updateMenuInputSchema,
  ByMenuIdParamsSchema,
  menuPublicResponseSchema,
  fullMenuPublicResponseSchema,
};
