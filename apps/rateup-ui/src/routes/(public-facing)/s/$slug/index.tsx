import { createFileRoute, redirect } from "@tanstack/react-router";

import {
  productHandle,
  resolveProductLink,
  storeHead,
} from "@/components/shop-public/storefrontSeo.ts";

interface StorefrontSearch {
  product?: string;
}

export const Route = createFileRoute("/(public-facing)/s/$slug/")({
  // Product links used to be ?product=<id>; they are in chats and catalogs already.
  validateSearch: (search: Record<string, unknown>): StorefrontSearch => ({
    product: typeof search.product === "string" && search.product ? search.product : undefined,
  }),
  loaderDeps: ({ search }) => ({ product: search.product }),
  loader: async ({ params, deps, parentMatchPromise }) => {
    const { storefront } = (await parentMatchPromise).loaderData ?? { storefront: null };
    if (storefront && deps.product) {
      const product = resolveProductLink(storefront.products, deps.product)?.product;
      throw redirect({
        ...(product
          ? {
              to: "/s/$slug/p/$handle",
              params: { slug: params.slug, handle: productHandle(product) },
            }
          : { to: "/s/$slug", params: { slug: params.slug }, search: {} }),
        statusCode: 301,
      });
    }
    return { storefront };
  },
  head: ({ loaderData }) =>
    loaderData?.storefront ? storeHead(loaderData.storefront, baseUrl()) : {},
  component: () => null,
});

const baseUrl = () => import.meta.env.VITE_FRONTEND_URL || "https://rateup.app";
