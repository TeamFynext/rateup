"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Center, Stack, Text } from "@mantine/core";
import { IconLoader } from "@tabler/icons-react";
import { useRouteAndCartStore } from "components/HomePage/pages/Pricing/store/RouteAndCartStore";
import { useTranslations } from "next-intl";
import Session from "supertokens-auth-react/recipe/session";

import { useUpdateShopifySession } from "@/backend/appsIntegration/shopify/shopify.query";
import RateupLoader from "@/components/Loaders/RateupLoader";

import style from "../../../components/Graph/graph.module.css";

export default function Page() {
  return (
    <Suspense fallback={<RateupLoader />}>
      <ShopifyAuthCallbackWithParams />
    </Suspense>
  );
}
function ShopifyAuthCallbackWithParams() {
  const searchParams = useSearchParams();
  return <ShopifyAuthCallback searchParams={searchParams} />;
}

const ShopifyAuthCallback = ({
  searchParams,
}: {
  searchParams: ReturnType<typeof useSearchParams>;
}) => {
  const router = useRouter();
  const shop = searchParams.get("shop");

  const updateShopifySession = useUpdateShopifySession();
  const { reset, updateRouteAndCart } = useRouteAndCartStore();
  const translations = useTranslations();
  useEffect(() => {
    if (!shop) {
      router.push("/login");
      return;
    }
    const checkSession = async () => {
      const isExist = await Session.doesSessionExist();
      if (!isExist) {
        localStorage.setItem(
          "shopify-auth-callback",
          `/auth/shopify?shop=${shop}`,
        );
        updateRouteAndCart(`/auth/shopify?shop=${shop}`, null);
        router.push("/login");
      } else {
        updateShopifySession.mutate(
          { shop, data: null },
          {
            onSuccess: () => {
              localStorage.removeItem("shopify-auth-callback");
              reset();
              router.push(`/dashboard`);
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
          <Text>{translations("WaitConnecting Shopify with Rateup")}</Text>
        </Stack>
      )}
    </Center>
  );
};
