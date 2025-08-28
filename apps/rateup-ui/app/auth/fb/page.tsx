"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Center, Stack, Text } from "@mantine/core";

import { useUpdateUserAccessToken } from "@/backend/whatsapp/settings/waSettings.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { showErrorToast } from "@/utils/notifications";

export default function Page() {
  return (
    <Suspense fallback={"loading"}>
      <FbLoginRedirectWithParams />
    </Suspense>
  );
}

// This component is rendered inside Suspense and uses useSearchParams directly
function FbLoginRedirectWithParams() {
  const searchParams = useSearchParams();
  return <FbLoginRedirect searchParams={searchParams} />;
}

// Accept searchParams as a prop
function FbLoginRedirect({
  searchParams,
}: {
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  const router = useRouter();
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const update = useUpdateUserAccessToken();

  useEffect(() => {
    const waSettingId = localStorage.getItem("waSettingsId");
    const automationId = localStorage.getItem("automationId");
    if (code) {
      update.mutate(
        { code, waSettingId },
        {
          onSuccess: () => {
            localStorage.removeItem("waSettingsId");
            localStorage.removeItem("automationId");
            router.push(
              `/dashboard/whatsapp/automated-replies/${automationId}`,
            );
          },
          onError: () => {
            localStorage.removeItem("waSettingsId");
            localStorage.removeItem("automationId");
            router.push(
              `/dashboard/whatsapp/automated-replies/${automationId}`,
            );
          },
        },
      );
    }
    if (error) {
      showErrorToast("Failed " + error);
      localStorage.removeItem("waSettingsId");
      localStorage.removeItem("automationId");
      router.push(`/dashboard/whatsapp/automated-replies/${automationId}`);
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
