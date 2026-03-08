"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Anchor, Center, Stack, Text } from "@mantine/core";
import { IconMoodSad, IconReload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import RateupLoader from "@/components/Loaders/RateupLoader";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import { API_URL } from "@/utils/constants";

export default function Page() {
  return (
    <Suspense fallback={<RateupLoader />}>
      <ShopifyCallbackRetryWithParams />
    </Suspense>
  );
}
function ShopifyCallbackRetryWithParams() {
  const searchParams = useSearchParams();
  return <ShopifyCallbackRetry searchParams={searchParams} />;
}

const ShopifyCallbackRetry = ({
  searchParams,
}: {
  searchParams: ReturnType<typeof useSearchParams>;
}) => {
  const router = useRouter();
  const shop = searchParams.get("shop");
  const translations = useTranslations();
  return (
    <Center h={"100vh"}>
      <PaperLayout w={400} p={"xl"}>
        <Stack justify="center" align="center">
          <IconMoodSad size={"5rem"} stroke={1} />
          <Text>{translations("Something went wrong")}</Text>
          <RateupButtonBlue
            title={translations("Retry")}
            onClick={() => {
              const regex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com/;
              if (!shop || !regex.test(shop)) {
                router.push("/login");
              }
              window.open(
                `${API_URL}/api/public/integrations/shopify/auth?shop=${shop}`,
              );
            }}
            fullWidth
            leftIcon={<IconReload size={"1rem"} />}
          />
          <Anchor component={Link} href="/login">
            {translations("Go Back")}
          </Anchor>
        </Stack>
      </PaperLayout>
    </Center>
  );
};
