import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";

import { MenuButtons } from "@/types/enums";

export const schema = z
  .object({
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
      .trim()
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
  })
  .superRefine((values, ctx) => {
    values.menuButtons?.map((data, index) => {
      if (
        [MenuButtons.CONTACT, MenuButtons.WHATSAPP].includes(
          data.name as any,
        ) &&
        !isValidPhoneNumber(data.link)
      ) {
        ctx.addIssue({
          path: [`menuButtons.${index}.link`],
          code: z.ZodIssueCode.custom,
          message: "Phone number should be valid",
        });
      } else if (
        ![MenuButtons.CONTACT, MenuButtons.WHATSAPP].includes(data.name as any)
      ) {
        try {
          new URL(data.link);
        } catch {
          ctx.addIssue({
            path: [`menuButtons.${index}.link`],
            code: z.ZodIssueCode.custom,
            message: "URL should be valid",
          });
        }
      }
    });
  });
