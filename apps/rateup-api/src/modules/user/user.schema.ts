import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";
import { UserRecipes } from "../../types/enums";

const userCore = {
  id: z.string().uuid(),
  prefLanguage: z.string().optional(),
};

const createUserSchema = z.object({
  ...userCore,
  email: z.string().email(),
  recipeName: z.nativeEnum(UserRecipes),
});

const userInfoSchema = z.object({
  ...userCore,
});

const createUserSignupSchema = z.object({
  ...userCore,
  email: z.string().email(),
  name: z.string().min(1),
  orgName: z.string().min(1),
  phone: z.string(),
  phoneNumber: z.string().optional(),
  recipeName: z.nativeEnum(UserRecipes),
  planId: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  goals: z.array(z.string()).optional(),
  integrationsSelected: z.array(z.string()).optional(),
});

const pauseUserSchema = z.object({
  isPaused: z.boolean(),
  pausedBy: z.string(),
});

const createUserGoogleSchema = z.object({
  name: z.string().min(4),
  orgName: z.string().min(4),
  phoneNumber: z.string(),
  type: z.string(),
  email: z.string().optional(),
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
      message: "Invalid photo.",
    }),
});

const userEmailCheckSchema = z.object({
  email: z.string().email(),
});

export enum UserAvailabilityStatus {
  offline = "offline",
  online = "online",
}

const userStatusSchema = z.object({
  status: z.nativeEnum(UserAvailabilityStatus),
});

export const { schemas: userSchemas, $ref: $UserRef } = buildJsonSchemas(
  {
    createUserSignupSchema,
    createUserGoogleSchema,
    changeUserPasswordSchema,
    updateProfileSchema,
    updateProfilePhotoSchema,
    updateUserLanguageSchema,
    userEmailCheckSchema,
    pauseUserSchema,
    userStatusSchema,
  },
  { $id: "userSchema" },
);

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
