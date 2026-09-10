import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";

// The Program sections show the full editors themselves now, so "advanced" is just the
// section. Kept so links saved while it was a separate page still land.
const searchSchema = z.object({
  section: z.enum(["earning", "rewards"]).catch("rewards"),
});

export const Route = createFileRoute("/dashboard/loyalty/program/advanced/")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: LOYALTY_PATHS.program,
      search: { section: search.section },
      replace: true,
    });
  },
});
