import { buildJsonSchemas } from "fastify-zod";
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
};

const updateMenuInputSchema = z.object({
  name: z.string().optional(),
  displayName: z.string().optional(),
  locationText: z.string().optional(),
  locationUrl: z.string().optional(),
  websiteText: z.string().optional(),
  websiteUrl: z.string().optional(),
  logo: z.string().optional(),
  backgroundImage: z.string().optional(),
  surveyTeamMapId: z.string().optional(),
  isPublished: z.boolean().optional(),
  itemOrder: z.string().optional()
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
  websiteText: z.string().optional(),
  websiteUrl: z.string().optional(),
  logo: z.string().optional(),
});

const fullMenuPublicResponseSchema = z.object({
  ...menuPublicResponseSchema.shape,
  categories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      image: z.string().optional(),
      items: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().optional(),
          images: z.array(z.string()).optional(),
          videoUrl: z.string().optional(),
          price: z.any(),
        })
      ),
    })
  ),
  menuLanding: z
    .object({
      backgroundImage: z.string().optional().nullable(),
      mobileBackgroundImage: z.string().optional().nullable(),
    })
    .nullable(),
});
const StyleSchema = z.object({
  fontFamily: z.string(),
  fontWeight: z.string(),
  fontSize: z.number(),
  color: z.string(),
});
const updateMenuLandingInputSchema = z.object({
  headerStyle: StyleSchema,
  titleStyle: StyleSchema.merge(
    z.object({
      fontSize: z.number(),
    })
  ),
  otherStyle: z.object({
    fontFamily: z.string(),
    color: z.string(),
  }),
  headerText: z.string(),
  titleText: z.string(),
  locationText: z.string().optional(),
  websiteText: z.string().optional(),
  logo: z.string().optional(),
  backgroundImage: z.string().optional(),
  mobileBackgroundImage: z.string().optional(),
});

const atLeastOneDefined = (obj: Record<string, unknown>) =>
  Object.values(obj).some((v) => v !== undefined);

const updateLandingPageOptionSchema = z.object({
  option: z
    .object({
      menuPageEnabled: z.boolean().optional(),
      feedbackPageEnabled: z.boolean().optional(),
    })
    .refine(atLeastOneDefined, {
      message: "At least one option must be selected",
    }),
});

export const { schemas: menuSchemas, $ref: $Mref } = buildJsonSchemas(
  {
    menuInputSchema,
    menuSchema,
    updateMenuInputSchema,
    ByMenuIdParamsSchema,
    menuPublicResponseSchema,
    fullMenuPublicResponseSchema,
    updateMenuLandingInputSchema,
    updateLandingPageOptionSchema,
  },
  {
    $id: "menuSchema",
  }
);

export type CreateMenuInput = z.infer<typeof menuInputSchema>;
export type Menu = z.infer<typeof menuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuInputSchema>;
export type ByMenuIdParams = z.infer<typeof ByMenuIdParamsSchema>;
export type updateMenuLandingInput = z.infer<
  typeof updateMenuLandingInputSchema
>;
export type updateLandingPageOption = z.infer<
  typeof updateLandingPageOptionSchema
>;

//
