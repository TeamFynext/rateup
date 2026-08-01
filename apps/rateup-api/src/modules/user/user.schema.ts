import { z } from "zod";

import { UserRecipes } from "../../types/enums.js";
import { UserPresenceMode } from "../../../generated/prisma/enums.js";

const userCore = {
  id: z.uuid(),
  prefLanguage: z.string().optional(),
};

const createUserSchema = z.object({
  ...userCore,
  email: z.email(),
  recipeName: z.enum(UserRecipes),
});

const userInfoSchema = z.object({
  ...userCore,
});

const createUserSignupSchema = z.object({
  ...userCore,
  email: z.email(),
  name: z.string().min(1),
  orgName: z.string().min(1),
  phone: z.string().optional(),
  phoneNumber: z.string().optional(),
  recipeName: z.enum(UserRecipes),
  planId: z.string().optional(),
  location: z.string().optional(),
  website: z.url().optional(),
  industry: z.string().optional(),
  goals: z.array(z.string()).optional(),
  integrationsSelected: z.array(z.string()).optional(),
  teamSize: z.string().optional(),
  referralCode: z.string().optional(),
});

const pauseUserSchema = z.object({
  isPaused: z.boolean(),
  pausedBy: z.string(),
});

const createUserGoogleSchema = z.object({
  name: z.string().min(1),
  orgName: z.string().min(1),
  phone: z.string().optional(),
  phoneNumber: z.string(),
  type: z.string(),
  email: z.string().optional(),
  goals: z.array(z.string()).optional(),
  integrationsSelected: z.array(z.string()).optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  referralCode: z.string().optional(),
});

const changeUserPasswordSchema = z.object({
  existingPassword: z.string().min(4),
  newPassword: z.string().min(4),
});

const updateProfileSchema = z.object({
  title: z.string(),
  name: z.string(),
  phone: z.string(),
});

const updateUserLanguageSchema = z.object({
  prefLanguage: z.string().optional(),
});

const updateProfilePhotoSchema = z.object({
  profilePhoto: z
    .string()
    .min(6)
    .refine((value) => value.includes("."), {
      error: "Invalid photo.",
    }),
});

const userEmailCheckSchema = z.object({
  email: z.email(),
});

export enum UserAvailabilityStatus {
  offline = "offline",
  online = "online",
  busy = "busy",
}

const userStatusSchema = z.object({
  status: z.enum(UserAvailabilityStatus),
  presenceMode: z.enum(UserPresenceMode),
});

export type CreateUserParams = z.infer<typeof createUserSchema>;
export type userInfoParams = z.infer<typeof userInfoSchema>;
export type CreateUserSignupSchema = z.infer<typeof createUserSignupSchema>;
export type CreateUserGoogleSchema = z.infer<typeof createUserGoogleSchema>;
export type ChangeUserPasswordSchema = z.infer<typeof changeUserPasswordSchema>;
export type updateUserLanguageSchema = z.infer<typeof updateUserLanguageSchema>;
export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;
export type UpdateProfilePhotoSchema = z.infer<typeof updateProfilePhotoSchema>;
export type userEmailCheckSchemaInput = z.infer<typeof userEmailCheckSchema>;
export type PauseUserInput = z.infer<typeof pauseUserSchema>;
export type UserStatusSchema = z.infer<typeof userStatusSchema>;

// Auto-exported after fastify-zod migration
export {
  createUserSignupSchema,
  createUserGoogleSchema,
  changeUserPasswordSchema,
  updateProfileSchema,
  updateProfilePhotoSchema,
  updateUserLanguageSchema,
  userEmailCheckSchema,
  pauseUserSchema,
  userStatusSchema,
};
