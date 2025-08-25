import React, { useEffect } from "react";
import { useRouter } from "next/router";

import { Center, Stack, Text } from "@mantine/core";

import { useUpdateUserAccessToken } from "@/backend/whatsapp/settings/waSettings.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { showErrorToast } from "@/utils/notifications";

const FbLoginRedirect = () => {
  const router = useRouter();
  const { code, error } = router.query as { code: string; error?: string };
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
      showErrorToast("Failed" + error);
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
};

export default FbLoginRedirect;
