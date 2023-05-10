import { z } from "zod";

const createUserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
});

export type CreateUserParams = z.infer<typeof createUserSchema>;
