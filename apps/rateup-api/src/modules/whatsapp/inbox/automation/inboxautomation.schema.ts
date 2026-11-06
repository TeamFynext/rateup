import z from "zod";

const updateInboxAutomationSchema = z.object({
  active: z.boolean().optional(),
  action: z.enum(["CLOSE"]).nullable().optional(),
  condition: z.enum(["UNASSIGNED", "NEW", "ASSIGNED"]),
  closeAfterHours: z.number().nullable().optional(),
});

const getInboxAutomationQuerySchema = z.object({
  condition: z.enum(["UNASSIGNED", "NEW", "ASSIGNED"]).optional(),
});

const deleteInboxAutomationQuerySchema = z.object({
  condition: z.enum(["UNASSIGNED", "NEW", "ASSIGNED"]),
});

const enableInboxAutomationSchema = z.object({
  condition: z.enum(["UNASSIGNED", "NEW", "ASSIGNED"]),
});

export type UpdateInboxAutomationInput = z.infer<typeof updateInboxAutomationSchema>;
export type GetInboxAutomationQuery = z.infer<typeof getInboxAutomationQuerySchema>;
export type DeleteInboxAutomationQuery = z.infer<typeof deleteInboxAutomationQuerySchema>;
export type EnableInboxAutomationInput = z.infer<typeof enableInboxAutomationSchema>;

export {
  updateInboxAutomationSchema,
  getInboxAutomationQuerySchema,
  deleteInboxAutomationQuerySchema,
  enableInboxAutomationSchema,
};
