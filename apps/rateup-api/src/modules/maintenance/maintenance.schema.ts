import { z } from "zod/v4";

export const taskIdParamSchema = z.object({ taskId: z.string().min(1) });
export type TaskIdParamInput = z.infer<typeof taskIdParamSchema>;

export const runTaskSchema = z.object({
  /** Absent or false means dry run. Nothing writes unless this is explicitly true. */
  apply: z.boolean().optional(),
});
export type RunTaskInput = z.infer<typeof runTaskSchema>;
