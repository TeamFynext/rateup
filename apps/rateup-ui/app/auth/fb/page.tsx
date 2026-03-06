"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Center, Stack, Text } from "@mantine/core";
import { toast } from "sonner";

import { useUpdateUserAccessToken } from "@/backend/whatsapp/settings/waSettings.query";
import RateupLoader from "@/components/Loaders/RateupLoader";

export default function Page() {
  return (
    <Suspense fallback={<RateupLoader />}>
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
            router.push(`/dashboard/whatsapp/flowbots/${automationId}`);
          },
          onError: () => {
            localStorage.removeItem("waSettingsId");
            localStorage.removeItem("automationId");
            router.push(`/dashboard/whatsapp/flowbots/${automationId}`);
          },
        },
      );
    }
    if (error) {
      toast.error("Failed " + error);
      localStorage.removeItem("waSettingsId");
      localStorage.removeItem("automationId");
      router.push(`/dashboard/whatsapp/flowbots/${automationId}`);
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
