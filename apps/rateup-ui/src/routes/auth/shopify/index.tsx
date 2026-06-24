import { Center, Stack, Text } from "@mantine/core";
import { IconLoader } from "@tabler/icons-react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Session from "supertokens-auth-react/recipe/session";

import { useUpdateShopifySession } from "@/backend/appsIntegration/shopify/shopify.query";
import { useRouteAndCartStore } from "@/components/HomePage/pages/Pricing/store/RouteAndCartStore.ts";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";

import style from "@/components/Graph/graph.module.css";

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
  const searchParams = useSearch({ strict: false });
  return <ShopifyAuthCallback searchParams={searchParams} />;
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
        updateRouteAndCart(`/auth/shopify?shop=${shop}`, null);
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
    <Center h={"100vh"}>
      {updateShopifySession.isPending && (
        <Stack justify="center" align="center">
          <IconLoader className={style.rotateInfinitely} display={"block"} />
          <Text>{translations("Wait..Connecting Shopify with Rateup")}</Text>
        </Stack>
      )}
    </Center>
  );
}
