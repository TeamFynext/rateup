import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useCreateAuthToken } from "@/backend/appsIntegration/integration.query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/auth/oauth2callback/")({
  component: AuthCallBack,
});

function AuthCallBack() {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false });
  const code = searchParams.code;
  const error = searchParams.error;
  const [callbackRoute, setCallBackRoute] = useState(
    "/dashboard/settings/integrations/googlesheet",
  );

  const [isLoading, setIsLoading] = useState(true);
  const mut = useCreateAuthToken();

  useEffect(() => {
    const route =
      localStorage.getItem("google-callback-route") ??
      "/dashboard/settings/integrations/googlesheet";
    setCallBackRoute(route);
    if (error) {
      navigate({
        to: route,
      });
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
  }, [code, error]);

  return (
    <div className="mt-50 flex items-center justify-center">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-4">
          <p> Please wait..</p>
          <Spinner className="size-8" />
        </div>
      ) : (
        <Card className="border p-8 shadow-xl">
          <h2 className="text-2xl font-semibold">Your accout has been synced with RateUp</h2>
          <div className="mt-8 flex justify-center">
            <Button
              onClick={() => {
                navigate({
                  to: callbackRoute,
                });
              }}
            >
              Go Back
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
