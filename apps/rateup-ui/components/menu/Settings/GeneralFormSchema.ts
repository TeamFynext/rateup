import { z } from "zod";

export const schema = z.object({
  name: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  teamId: z.string().min(1),
  surveyTeamMapId: z.string().optional().nullable(),
  currency: z.string(),
  unsplashImage: z
    .object({
      mobileBackgroundImage: z.boolean().optional(),
      backgroundImage: z.boolean().optional(),
    })
    .optional()
    .nullable(),
  menuButtons: z.array(
    z.object({
      name: z.string().trim().min(1),
      link: z.string().trim().min(1),
    }),
  ),
  locationUrl: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (value === "") return true;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "location URL should be valid",
      },
    ),
});
