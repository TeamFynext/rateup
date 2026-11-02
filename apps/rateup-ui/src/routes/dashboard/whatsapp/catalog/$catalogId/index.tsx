import { createFileRoute, redirect } from "@tanstack/react-router";

/** A catalog's page moved to the Commerce section; old links keep working. */
export const Route = createFileRoute("/dashboard/whatsapp/catalog/$catalogId/")({
  beforeLoad: ({ params, location }) => {
    throw redirect({
      to: "/dashboard/commerce/catalogs/$catalogId",
      params: { catalogId: params.catalogId },
      search: location.search as never,
      hash: location.hash,
      replace: true,
    });
  },
});
