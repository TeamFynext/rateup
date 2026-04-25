import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod/v4";

import { MenuButtons } from "@/types/enums";

export const schema = z
  .object({
    name: z.string().trim().min(1),
    displayName: z.string().trim().min(1),
    teamId: z.string().min(1),
    surveyTeamMapId: z.string().optional().nullable(),
    currency: z.string(),
    hideUnavailableCategory: z.string().optional(),
    backgroundImage: z.string().optional(),
    mobileBackgroundImage: z.string().optional(),
    logo: z.string().optional(),
    locationText: z.string().optional(),
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
  .check((ctx) => {
    const { value: values } = ctx;
    values.menuButtons?.map((data, index) => {
      const isPhoneButton =
        data.name === MenuButtons.CONTACT || data.name === MenuButtons.WHATSAPP;

      if (isPhoneButton && !isValidPhoneNumber(data.link)) {
        ctx.issues.push({
          path: [`menuButtons.${index}.link`],
          code: "custom",
          message: "Phone number should be valid",
          input: "",
        });
      } else if (!isPhoneButton) {
        try {
          new URL(data.link);
        } catch {
          ctx.issues.push({
            path: [`menuButtons.${index}.link`],
            code: "custom",
            message: "URL should be valid",
            input: "",
          });
        }
      }
    });
  });
