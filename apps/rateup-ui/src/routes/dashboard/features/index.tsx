import { createFileRoute, redirect } from "@tanstack/react-router";

/** Features was renamed Customize Menu; old links keep working. */
export const Route = createFileRoute("/dashboard/features/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/customize-menu", replace: true });
  },
});
