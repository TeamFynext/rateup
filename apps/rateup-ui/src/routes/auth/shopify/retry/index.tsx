import { IconMoodSad, IconReload } from "@tabler/icons-react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";

import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  // The callback's query string is read key-by-key; every value arrives as a string.
  const searchParams = useSearch({ strict: false });
  const stringParams = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, String(value ?? "")]),
  );
  return <ShopifyCallbackRetry searchParams={stringParams} />;
}

function ShopifyCallbackRetry({
  searchParams,
}: Readonly<{ searchParams: Record<string, string> }>) {
  const navigate = useNavigate();
  const shop = searchParams.shop;
  const { t: translations } = useTranslation();
  return (
    <div className="flex h-screen items-center justify-center">
      <Card className="w-100 p-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <IconMoodSad size={"5rem"} stroke={1} />
          <p>{translations("Something went wrong..")}</p>
          <Button
            onClick={() => {
              const regex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com/;
              if (!shop || !regex.test(shop)) {
                navigate({
                  to: "/login",
                });
              }
              window.open(`${API_URL}/api/public/integrations/shopify/auth?shop=${shop}`);
            }}
            className="w-full"
          >
            <IconReload size={"1rem"} /> {translations("Retry")}
          </Button>
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            {translations("Go Back")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
