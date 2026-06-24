import { Center, Flex, Image, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBrandGoogleDrive } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useDeleteIntegrationMutation,
  useGetGoogleSheetAuthorizationUrl,
  useIntegrationByType,
} from "@/backend/appsIntegration/integration.query";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons.tsx";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput.tsx";
import ConfirmationModal from "@/components/Modal/ConfirmationModal.tsx";
import PaperLayout from "@/components/styled/Layouts/PaperLayout.tsx";
import { IntegratedApps } from "@/types/enums.ts";

export function GoogleSheet() {
  const [alertModalOpened, { open: alertModalOpen, close: alertModalClose }] = useDisclosure(false);

  const { data: googleAccessToken } = useIntegrationByType(IntegratedApps.googlesheet);

  const deleteAccount = useDeleteIntegrationMutation(IntegratedApps.googlesheet);
  const { t: translations } = useTranslation();
  const { data: authUrl } = useGetGoogleSheetAuthorizationUrl();
  const [, setCallBackRoute] = useState<string>(() => {
    try {
      return (
        localStorage.getItem("google-callback-route") ?? "/dashboard/apps&services/googlesheet"
      );
    } catch {
      return "/dashboard/apps&services/googlesheet";
    }
  });
  const persistCallbackRoute = (value: string) => {
    setCallBackRoute(value);
    try {
      localStorage.setItem("google-callback-route", value);
    } catch {}
  };

  const handleSignOutGoogleSync = () => {
    toast.loading(translations("Hold on, Signing out from google sheet.."), {
      id: "integration-delete",
    });
    deleteAccount.mutate();
  };
  if (!googleAccessToken)
    return (
      <Center h={"80vh"}>
        <Stack align="center" justify="center">
          <Image src={"../../images/googlesheeticon.png"} h={100} w={80} />
          <RateupButtonPrimary
            title={translations("Sync Google Account")}
            onClick={() => {
              persistCallbackRoute("/dashboard/apps&services/googlesheet");
              window.open(authUrl);
            }}
            leftIcon={<IconBrandGoogleDrive />}
            size="md"
          />
        </Stack>
      </Center>
    );
  return (
    <Stack p={"xl"}>
      <Title order={3}>{translations("Google Sheet Config")}</Title>
      <PaperLayout>
        <Flex justify="space-between">
          {googleAccessToken?.credential?.userEmail && (
            <Stack w={"40%"}>
              <Title order={4}>{translations("Synced account info")}</Title>
              <ContainedTextField
                value={googleAccessToken?.credential?.userEmail}
                disabled
                label={translations("Email Address")}
              />
            </Stack>
          )}
          <RateupButtonPrimary
            title={translations("Sign out of google synced account")}
            onClick={alertModalOpen}
          />
        </Flex>
        <ConfirmationModal
          opened={alertModalOpened}
          onClose={alertModalClose}
          headerTitle={translations("Sign out")}
          headerLabel={translations("Are you sure you want to sign out from the synced account?")}
          confirmLabel={translations("Yes")}
          onConfirm={handleSignOutGoogleSync}
        />
      </PaperLayout>
    </Stack>
  );
}
