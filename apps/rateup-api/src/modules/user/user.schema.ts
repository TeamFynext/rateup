import { z } from "zod";

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
});

export type CreateUserParams = z.infer<typeof createUserSchema>;

export type userInfoParams = z.infer<typeof userInfoSchema>;
export type CreateUserSignupSchema = z.infer<typeof createUserSignupSchema>;

