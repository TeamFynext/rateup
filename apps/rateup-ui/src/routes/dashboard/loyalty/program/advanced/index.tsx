import { createFileRoute, redirect } from "@tanstack/react-router";

import { LOYALTY_PATHS } from "@/components/dashboard/loyalty/paths.ts";
import { oneOf } from "@/utils/search.ts";

// The Program sections show the full editors themselves now, so "advanced" is just the
// section. Kept so links saved while it was a separate page still land.
const SECTIONS = ["earning", "rewards"] as const;

export const Route = createFileRoute("/dashboard/loyalty/program/advanced/")({
  validateSearch: (search: Record<string, unknown>): { section: (typeof SECTIONS)[number] } => ({
    section: oneOf(SECTIONS, search.section) ?? "rewards",
  }),
  beforeLoad: ({ search }) => {
    if (search.section === "rewards") {
      throw redirect({ to: LOYALTY_PATHS.rewards, replace: true });
    }
    throw redirect({
      to: LOYALTY_PATHS.program,
      search: { section: search.section },
      replace: true,
    });
  },
});
