import { createFileRoute, redirect } from "@tanstack/react-router";

// Catalog moved to the Commerce section.
export const Route = createFileRoute("/dashboard/whatsapp/catalog/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/commerce/catalogs" });
  },
});
