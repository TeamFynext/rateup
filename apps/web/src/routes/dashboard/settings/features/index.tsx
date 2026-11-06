import { createFileRoute, redirect } from "@tanstack/react-router";

// Features (now Customize Menu) moved to its own entry in the main navigation; old links still land there.
export const Route = createFileRoute("/dashboard/settings/features/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/customize-menu", replace: true });
  },
});
