import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/qrCreator/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/qr-codes" });
  },
});
