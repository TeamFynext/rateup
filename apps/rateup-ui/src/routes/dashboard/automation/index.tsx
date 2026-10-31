import { createFileRoute, redirect } from "@tanstack/react-router";

/** Automation is a group now (Rules and Journeys); its own address opens Rules. */
export const Route = createFileRoute("/dashboard/automation/")({
  beforeLoad: ({ location }) => {
    throw redirect({ to: "/dashboard/automation/rules", hash: location.hash, replace: true });
  },
});
