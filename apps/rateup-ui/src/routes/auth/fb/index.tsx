import { Center, Stack, Text } from "@mantine/core";
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
  const searchParams = useSearch({ strict: false });
  return <FbLoginRedirect searchParams={searchParams} />;
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
    const waSettingId = localStorage.getItem("waSettingsId");
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
    <Center h="100vh">
      <Stack>
        <RateupLoader />
        <Text>Please wait...</Text>
      </Stack>
    </Center>
  );
}
