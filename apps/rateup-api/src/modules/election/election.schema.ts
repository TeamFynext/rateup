import { z } from "zod";

const mediaCore = {
  type: z.string(),
  name: z.string(),
  image: z.string(),
};

const rankQuerySchema = z.object({
  rank: z.boolean(),
});

export type rankQuerySchema = z.infer<typeof rankQuerySchema>;
