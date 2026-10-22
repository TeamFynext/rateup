import { createFileRoute, Outlet, useMatch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { ShopUnavailable } from "@/components/shop-public/shared.tsx";
import { StorefrontPage } from "@/components/shop-public/storefront/StorefrontPage.tsx";
import { productHandle, productPath } from "@/components/shop-public/storefrontSeo.ts";
import { noindexHead } from "@/lib/metadata.ts";

/**
 * The storefront and every product URL under it. The page lives here rather than in the child
 * routes so moving between /s/<slug> and /s/<slug>/p/<handle> only opens or closes the product
 * sheet: search, collection and scroll position survive.
 */
export const Route = createFileRoute("/(shop)/s/$slug")({
  loader: async ({ params }) => {
    // Imported here: route options land in the client entry, and the API client is axios.
    const { getStorefront } = await import("@/backend/commerce/shop.api");
    const { isNotFound } = await import("@/utils/apiError.ts");
    const { ssrVisitorHeaders } = await import("@/lib/ssrVisitorHeaders.ts");
    try {
      return { storefront: await getStorefront(params.slug, ssrVisitorHeaders()) };
    } catch (error) {
      // Only a missing shop is "unavailable". A rate limit or outage must fail the page instead:
      // rendered as unavailable, it carries noindex and a crawler would drop the shop.
      if (isNotFound(error)) return { storefront: null };
      throw error;
    }
  },
  head: ({ loaderData }) => (loaderData?.storefront ? {} : noindexHead()),
  component: StorefrontRoute,
});

function StorefrontRoute() {
  const { storefront } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const navigate = Route.useNavigate();
  const { t } = useTranslation();
  const productMatch = useMatch({
    from: "/(shop)/s/$slug/p/$handle",
    shouldThrow: false,
  });

  if (!storefront) {
    return (
      <ShopUnavailable
        title={t("This shop isn't available")}
        description={t("The link may be out of date, or the shop is closed for now.")}
      />
    );
  }

  return (
    <>
      <StorefrontPage
        storefront={storefront}
        productId={productMatch?.loaderData?.productId}
        productHref={(product) => productPath(slug, product)}
        onProductChange={(id) => {
          const product = id ? storefront.products.find((p) => p.id === id) : undefined;
          void (product
            ? navigate({
                to: "/s/$slug/p/$handle",
                params: { slug, handle: productHandle(product) },
                resetScroll: false,
              })
            : navigate({ to: "/s/$slug", params: { slug }, replace: true, resetScroll: false }));
        }}
      />
      <Outlet />
    </>
  );
}
