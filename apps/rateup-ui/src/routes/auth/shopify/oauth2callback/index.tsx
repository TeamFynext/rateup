import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCreateAuthToken } from "@/backend/appsIntegration/integration.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useCheckSession } from "@/hooks/checkSession.tsx";

export const Route = createFileRoute("/auth/shopify/oauth2callback/")({
  component: Page,
});

function Page() {
  return (
    <Suspense fallback={<RateupLoader />}>
      <AuthCallBackWithParams />
    </Suspense>
  );
}

function AuthCallBackWithParams() {
  // The callback's query string is read key-by-key; every value arrives as a string.
  const searchParams = useSearch({ strict: false });
  const stringParams = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, String(value ?? "")]),
  );
  return <AuthCallBack searchParams={stringParams} />;
}
function AuthCallBack({ searchParams }: { searchParams: Record<string, string> }) {
  const navigate = useNavigate();
  const code = searchParams.code;
  const error = searchParams.error;

  const { t: translations } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const mut = useCreateAuthToken();
  const session = useCheckSession();
  const backToShopify = () =>
    navigate({ to: "/dashboard/settings/integrations/$id", params: { id: "shopify" } });

  useEffect(() => {
    if (!session) {
      navigate({
        to: "/login",
      });
    }
    if (error) {
      void backToShopify();
    } else if (code) {
      mut.mutate(
        { code: code },
        {
          onSuccess: () => {
            setIsLoading(false);
          },
        },
      );
    }
  }, [code, error, session]);

  return (
    <div className="mt-50 flex items-center justify-center">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-4">
          <p> {translations("Please wait..")}</p>
          <Spinner className="size-8" />
        </div>
      ) : (
        <Card className="border p-8 shadow-xl">
          <h2 className="text-2xl font-semibold">
            {translations("Your accout has been synced with RateUp")}
          </h2>
          <div className="mt-8 flex justify-center">
            <Button onClick={() => void backToShopify()}>{translations("Go Back")}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
