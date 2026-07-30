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
  const searchParams = useSearch({ strict: false });
  return <AuthCallBack searchParams={searchParams} />;
}
function AuthCallBack({ searchParams }: { searchParams: Record<string, string> }) {
  const navigate = useNavigate();
  const code = searchParams.code;
  const error = searchParams.error;

  const [callbackRoute, setCallBackRoute] = useState("/dashboard/settings");
  const { t: translations } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const mut = useCreateAuthToken();
  const session = useCheckSession();

  useEffect(() => {
    if (!session) {
      navigate({
        to: "/login",
      });
    }
    setCallBackRoute(JSON.parse(localStorage?.getItem("google-callback-route") ?? "null"));
    if (error) {
      navigate({
        to: callbackRoute,
      });
    } else if (code) {
      mut.mutate(
        { code: code },
        {
          onSuccess: () => {
            setIsLoading(false);
            setCallBackRoute(JSON.parse(localStorage?.getItem("google-callback-route") ?? "null"));
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
            <Button
              onClick={() => {
                navigate({
                  to: callbackRoute,
                });
              }}
            >
              {translations("Go Back")}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
