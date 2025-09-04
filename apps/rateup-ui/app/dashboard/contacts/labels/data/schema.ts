import { z } from "zod";

export const labelFormSchema = z.object({
  name: z.string().min(1, "Tag name required"),
  color: z.string().min(1, "Color required"),
  description: z.string().optional(),
});

export type LabelForm = z.infer<typeof labelFormSchema>;
