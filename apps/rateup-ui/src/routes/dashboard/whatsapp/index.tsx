import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/whatsapp/")({
  loader: () => {
    throw redirect({ to: "/dashboard/whatsapp/flows" });
  },
});
