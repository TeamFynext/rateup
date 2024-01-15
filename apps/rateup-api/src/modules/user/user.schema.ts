import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

const userCore = {
  id: z.string().uuid(),
};

const createUserSchema = z.object({
  ...userCore,
  email: z.string().email(),
});

const userInfoSchema = z.object({
  ...userCore,
});

const createUserSignupSchema = z.object({
  ...userCore,
  email: z.string().email(),
  name: z.string().min(4),
  orgName: z.string().min(4),
  phone: z.string(),
});

const createUserGoogleSchema = z.object({
  inviteCode: z.string().min(4),
  name: z.string().min(4),
  orgName: z.string().min(4),
  type: z.string(),
  email: z.string().optional(),
});

const changeUserPasswordSchema = z.object({
  existingPassword: z.string().min(4),
  newPassword: z.string().min(4),
});

const updateProfileSchema = z.object({
  title: z.string().min(3),
  name: z.string().min(4),
  phone: z.string().min(10),
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

export const { schemas: userSchemas, $ref: $UserRef } = buildJsonSchemas(
  {
    createUserSignupSchema,
    createUserGoogleSchema,
    changeUserPasswordSchema,
    updateProfileSchema,
    updateProfilePhotoSchema,
    userEmailCheckSchema,
  },
  { $id: "userSchema" },
);

export type CreateUserParams = z.infer<typeof createUserSchema>;
export type userInfoParams = z.infer<typeof userInfoSchema>;
export type CreateUserSignupSchema = z.infer<typeof createUserSignupSchema>;
export type CreateUserGoogleSchema = z.infer<typeof createUserGoogleSchema>;
export type ChangeUserPasswordSchema = z.infer<typeof changeUserPasswordSchema>;
export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;
export type UpdateProfilePhotoSchema = z.infer<typeof updateProfilePhotoSchema>;
export type userEmailCheckSchemaInput = z.infer<typeof userEmailCheckSchema>;
