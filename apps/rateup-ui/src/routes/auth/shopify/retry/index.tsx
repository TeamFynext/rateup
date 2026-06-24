import { Anchor, Center, Stack, Text } from "@mantine/core";
import { IconMoodSad, IconReload } from "@tabler/icons-react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";

import { RateupButtonBlue } from "@/components/Button/RateupButtons.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import PaperLayout from "@/components/styled/Layouts/PaperLayout.tsx";
import { API_URL } from "@/utils/constants.ts";

export const Route = createFileRoute("/auth/shopify/retry/")({
  component: Page,
});

function Page() {
  return (
    <Suspense fallback={<RateupLoader />}>
      <ShopifyCallbackRetryWithParams />
    </Suspense>
  );
}

function ShopifyCallbackRetryWithParams() {
  const searchParams = useSearch({ strict: false });
  return <ShopifyCallbackRetry searchParams={searchParams} />;
}

function ShopifyCallbackRetry({ searchParams }: { searchParams: Record<string, string> }) {
  const navigate = useNavigate();
  const shop = searchParams.shop;
  const { t: translations } = useTranslation();
  return (
    <Center h={"100vh"}>
      <PaperLayout w={400} p={"xl"}>
        <Stack justify="center" align="center">
          <IconMoodSad size={"5rem"} stroke={1} />
          <Text>{translations("Something went wrong..")}</Text>
          <RateupButtonBlue
            title={translations("Retry")}
            onClick={() => {
              const regex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com/;
              if (!shop || !regex.test(shop)) {
                navigate({
                  to: "/login",
                });
              }
              window.open(`${API_URL}/api/public/integrations/shopify/auth?shop=${shop}`);
            }}
            fullWidth
            leftIcon={<IconReload size={"1rem"} />}
          />
          <Anchor component={Link} to="/login">
            {translations("Go Back")}
          </Anchor>
        </Stack>
      </PaperLayout>
    </Center>
  );
}
