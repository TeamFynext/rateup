import { createFileRoute, redirect } from "@tanstack/react-router";

import {
  productHandle,
  productHead,
  resolveProductLink,
} from "@/components/shop-public/storefrontSeo.ts";

export const Route = createFileRoute("/(shop)/s/$slug/p/$handle")({
  loader: async ({ params, parentMatchPromise }) => {
    const { storefront } = (await parentMatchPromise).loaderData ?? { storefront: null };
    if (!storefront) return { storefront: null, productId: undefined };

    const link = resolveProductLink(storefront.products, params.handle);
    // A product that was hidden or sold off lands on the shop rather than a dead page; it may
    // come back, so the redirect is temporary.
    if (!link) throw redirect({ to: "/s/$slug", params: { slug: params.slug }, statusCode: 302 });
    const { product } = link;
    // An old handle after a rename: one address per product.
    if (!link.canonical) {
      throw redirect({
        to: "/s/$slug/p/$handle",
        params: { slug: params.slug, handle: productHandle(product) },
        statusCode: 301,
      });
    }
    return { storefront, productId: product.id };
  },
  head: ({ loaderData }) => {
    const product = loaderData?.storefront?.products.find((p) => p.id === loaderData.productId);
    return loaderData?.storefront && product
      ? productHead(loaderData.storefront, product, baseUrl())
      : {};
  },
  component: () => null,
});

const baseUrl = () => import.meta.env.VITE_FRONTEND_URL || "https://rateup.app";
