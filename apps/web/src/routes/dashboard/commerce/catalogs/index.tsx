import { createFileRoute } from "@tanstack/react-router";

import { CatalogsPage } from "@/components/dashboard/commerce/pages/CatalogsPage";

export const Route = createFileRoute("/dashboard/commerce/catalogs/")({
  component: CatalogsPage,
});
