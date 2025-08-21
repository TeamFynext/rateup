import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { Center, Stack, Text } from "@mantine/core";
import { IconLoader } from "@tabler/icons-react";
import { useRouteAndCartStore } from "components/HomePage/pages/Pricing/store/RouteAndCartStore";
import { useTranslations } from "next-intl";
import Session from "supertokens-web-js/recipe/session";

import { useUpdateShopifySession } from "@/backend/appsIntegration/shopify/shopify.query";

import style from "../../../components/Graph/graph.module.css";

const ShopifyAuthCallback = () => {
  const router = useRouter();
  const { shop } = router.query;
  const updateShopifySession = useUpdateShopifySession();
  const { reset, updateRouteAndCart } = useRouteAndCartStore();
  const translations = useTranslations();
  useEffect(() => {
    if (!router.isReady) return;
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
  }, [router]);

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
};

export default ShopifyAuthCallback;
