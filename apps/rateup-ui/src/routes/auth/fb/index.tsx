import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";

import { useUpdateUserAccessToken } from "@/backend/whatsapp/settings/waSettings.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";

export const Route = createFileRoute("/auth/fb/")({
  component: Page,
});

function Page() {
  return (
    <Suspense fallback={<RateupLoader />}>
      <FbLoginRedirectWithParams />
    </Suspense>
  );
}

// This component is rendered inside Suspense and uses useSearchParams directly
function FbLoginRedirectWithParams() {
  // The callback's query string is read key-by-key; every value arrives as a string.
  const searchParams = useSearch({ strict: false });
  const stringParams = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [key, String(value ?? "")]),
  );
  return <FbLoginRedirect searchParams={stringParams} />;
}

// Accept searchParams as a prop
function FbLoginRedirect({
  searchParams,
}: Readonly<{
  searchParams: Record<string, string>;
}>) {
  const navigate = useNavigate();
  const code = searchParams.code;
  const error = searchParams.error;

  const update = useUpdateUserAccessToken();

  useEffect(() => {
    const waSettingId = localStorage.getItem("waSettingsId") ?? "";
    const automationId = localStorage.getItem("automationId");
    const automationRouteBase =
      localStorage.getItem("automationRouteBase") || "/dashboard/whatsapp/flowbots";
    const targetRoute = automationId
      ? `${automationRouteBase}/${automationId}`
      : "/dashboard/whatsapp/flowbots";
    if (code) {
      update.mutate(
        { code, waSettingId },
        {
          onSuccess: () => {
            localStorage.removeItem("waSettingsId");
            localStorage.removeItem("automationId");
            localStorage.removeItem("automationRouteBase");
            navigate({
              to: targetRoute,
            });
          },
          onError: () => {
            localStorage.removeItem("waSettingsId");
            localStorage.removeItem("automationId");
            localStorage.removeItem("automationRouteBase");
            navigate({
              to: targetRoute,
            });
          },
        },
      );
    }
    if (error) {
      toast.error("Failed " + error);
      localStorage.removeItem("waSettingsId");
      localStorage.removeItem("automationId");
      localStorage.removeItem("automationRouteBase");
      navigate({
        to: targetRoute,
      });
    }
  }, [code, error]);
  if (update.isPending) return <RateupLoader />;
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col gap-2">
        <RateupLoader />
        <p>Please wait...</p>
      </div>
    </div>
  );
}
