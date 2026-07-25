import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CashierPage } from "@/components/loyalty/CashierPage.tsx";

// The router's default search parser JSON-parses values, so an all-digit phone
// (`?phone=919876543210`) arrives as a number. Coerce it back to a string so the
// page can treat it as one.
const cashierSearchSchema = z.object({
  phone: z.coerce.string().optional().catch(undefined),
});

export const Route = createFileRoute("/dashboard/loyalty/cashier/")({
  validateSearch: cashierSearchSchema,
  component: CashierPage,
});
