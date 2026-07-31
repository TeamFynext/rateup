import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Session from "supertokens-auth-react/recipe/session";

import { useUpdateShopifySession } from "@/backend/appsIntegration/shopify/shopify.query";
import { useRouteAndCartStore } from "@/components/HomePage/pages/Pricing/store/RouteAndCartStore.ts";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/auth/shopify/")({
  component: Page,
});

function Page() {
  return (
    <Suspense fallback={<RateupLoader />}>
      <ShopifyAuthCallbackWithParams />
    </Suspense>
  );
}

function ShopifyAuthCallbackWithParams() {
  // The callback's query string is read key-by-key; every value arrives as a string.
  const searchParams = useSearch({ strict: false });
  const stringParams = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, String(value ?? "")]),
  );
  return <ShopifyAuthCallback searchParams={stringParams} />;
}

function ShopifyAuthCallback({
  searchParams,
}: Readonly<{
  searchParams: Record<string, string>;
}>) {
  const navigate = useNavigate();
  const shop = searchParams.shop;

  const updateShopifySession = useUpdateShopifySession();
  const { reset, updateRouteAndCart } = useRouteAndCartStore();
  const { t: translations } = useTranslation();
  useEffect(() => {
    if (!shop) {
      navigate({
        to: "/login",
      });
      return;
    }
    const checkSession = async () => {
      const isExist = await Session.doesSessionExist();
      if (!isExist) {
        localStorage.setItem("shopify-auth-callback", `/auth/shopify?shop=${shop}`);
        updateRouteAndCart(`/auth/shopify?shop=${shop}`, {});
        navigate({
          to: "/login",
        });
      } else {
        updateShopifySession.mutate(
          { shop, data: null },
          {
            onSuccess: () => {
              localStorage.removeItem("shopify-auth-callback");
              reset();
              navigate({
                to: `/dashboard`,
              });
            },
          },
        );
      }
      return isExist;
    };
    checkSession();
  }, [shop]);

  if (!shop) return null;

  return (
    <div className="flex h-screen items-center justify-center">
      {updateShopifySession.isPending && (
        <div className="flex flex-col items-center justify-center gap-4">
          <Spinner className="size-8" />
          <p>{translations("Wait..Connecting Shopify with Rateup")}</p>
        </div>
      )}
    </div>
  );
}
