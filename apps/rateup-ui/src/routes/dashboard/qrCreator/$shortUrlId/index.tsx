import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/qrCreator/$shortUrlId/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/dashboard/qr-codes/$shortUrlId", params });
  },
});
