import { createFileRoute, redirect } from "@tanstack/react-router";

import { validateCustomersSearch } from "@/components/dashboard/loyalty/customers/customers.search.ts";

/** Loyalty customers were renamed Members; old links keep working, `?phone=` included. */
export const Route = createFileRoute("/dashboard/loyalty/customers/")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/dashboard/loyalty/members",
      search: { phone: validateCustomersSearch(location.search as Record<string, unknown>).phone },
      replace: true,
    });
  },
});
