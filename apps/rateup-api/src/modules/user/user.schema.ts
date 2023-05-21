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

export type CreateUserParams = z.infer<typeof createUserSchema>;

export type userInfoParams = z.infer<typeof userInfoSchema>;
