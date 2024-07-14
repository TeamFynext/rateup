import { useRouter } from "next/router";
import { useEffect } from "react";
import { Center, Stack, Text } from "@mantine/core";
import { IconLoader } from "@tabler/icons-react";
import style from "../../../components/Graph/graph.module.css";
import { useUpdateShopifySession } from "backend/shopify/shopify.query";
import { useCheckSession } from "hooks/checkSession";
import { useRouteAndCartStore } from "components/HomePage/pages/Pricing/store/RouteAndCartStore";

const ShopifyAuthCallback = () => {
  const router = useRouter();
  const { shop } = router.query;
  const updateShopifySession = useUpdateShopifySession();
  const session = useCheckSession();
  const { reset, updateRouteAndCart } = useRouteAndCartStore();
  useEffect(() => {
    if (!session) {
      if (shop) {
        localStorage.setItem(
          "shopify-auth-callback",
          `/auth/shopify?shop=${shop}`,
        );
        updateRouteAndCart(`/auth/shopify?shop=${shop}`, null);
      }
      router.push("/login");
    }
    updateShopifySession.mutate(
      { shop, data: null },
      {
        onSuccess: () => {
          localStorage.setItem("shopify-auth-callback", null);
          reset();
          router.push(`/dashboard`);
        },
      },
    );
  }, [shop, session]);
  return (
    <Center h={"100vh"}>
      {updateShopifySession.isPending && (
        <Stack justify="center" align="center">
          <IconLoader className={style.rotateInfinitely} display={"block"} />
          <Text>Wait..Connecting Shopify with Rateup</Text>
        </Stack>
      )}
    </Center>
  );
};

export default ShopifyAuthCallback;
