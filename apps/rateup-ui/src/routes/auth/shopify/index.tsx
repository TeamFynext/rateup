import { IconMoodSad } from "@tabler/icons-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Session from "supertokens-auth-react/recipe/session";

import {
  isExpiredShopifyClaim,
  parseShopifyCallbackSearch,
  shopifyCallbackPath,
} from "@/backend/appsIntegration/shopify/shopify.claim.ts";
import { useUpdateShopifySession } from "@/backend/appsIntegration/shopify/shopify.query";
import { useRouteAndCartStore } from "@/components/HomePage/pages/Pricing/store/RouteAndCartStore.ts";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getApiErrorMessage } from "@/utils/apiError.ts";

export const Route = createFileRoute("/auth/shopify/")({
  validateSearch: parseShopifyCallbackSearch,
  component: Page,
});

function Page() {
  return (
    <Suspense fallback={<RateupLoader />}>
      <ShopifyAuthCallback />
    </Suspense>
  );
}

function ShopifyAuthCallback() {
  const { shop, claim } = Route.useSearch();
  const navigate = useNavigate();

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
    // Without a claim the API cannot link this install; the page says so below.
    if (!claim) return;
    const checkSession = async () => {
      const isExist = await Session.doesSessionExist();
      if (!isExist) {
        // The claim is single-use proof of this install; the return trip must keep it.
        const returnPath = shopifyCallbackPath(shop, claim);
        localStorage.setItem("shopify-auth-callback", returnPath);
        updateRouteAndCart(returnPath, {});
        navigate({
          to: "/login",
        });
      } else {
        updateShopifySession.mutate(
          { shop, claimToken: claim },
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
  }, [shop, claim]);

  if (!shop) return null;

  // No claim at all is an old or hand-made link, which the API would refuse the same way.
  const failed = !claim || updateShopifySession.isError;
  if (failed) {
    const message =
      !claim || isExpiredShopifyClaim(updateShopifySession.error)
        ? translations("This install link has expired — open the app from your Shopify admin again")
        : getApiErrorMessage(updateShopifySession.error, translations("Something went wrong.."));
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="w-100 p-8">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <IconMoodSad size={"5rem"} stroke={1} />
            <p role="alert">{message}</p>
            <Button className="w-full" nativeButton={false} render={<Link to="/dashboard" />}>
              {translations("Go to dashboard")}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

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
