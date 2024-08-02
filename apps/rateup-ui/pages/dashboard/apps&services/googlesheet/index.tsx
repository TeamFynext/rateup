import { Center, Flex, Image, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconBrandGoogleDrive } from "@tabler/icons-react";
import { RateupButtonPrimary } from "components/Button/RateupButtons";
import ConfirmationModal from "components/Modal/ConfirmationModal";
import { useLocalStorage } from "react-use";

import { IntegratedApps } from "@/types/enums";
import {
  useDeleteIntegrationMutation,
  useGetGoogleSheetAuthorizationUrl,
  useIntegrationByType,
} from "@/backend/appsIntegration/integration.query";
import { ContainedTextField } from "@/components/input/ContainedInput/ContainedInput";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";

const GoogleSheet = () => {
  const [alertModalOpened, { open: alertModalOpen, close: alertModalClose }] =
    useDisclosure(false);

  const { data: googleAccessToken } = useIntegrationByType(
    IntegratedApps.googlesheet,
  );

  const deleteAccount = useDeleteIntegrationMutation(
    IntegratedApps.googlesheet,
  );

  const { data: authUrl } = useGetGoogleSheetAuthorizationUrl();
  const [callbackRoute, setCallBackRoute] = useLocalStorage(
    "google-callback-route",
    "/dashboard/apps&services/googlesheet",
  );

  const handleSignOutGoogleSync = () => {
    notifications.show({
      id: "integration-delete",
      loading: true,
      title: "Signing out from google sheet",
      message: `Hold on, Signing out from google sheet..`,
      autoClose: false,
      withCloseButton: false,
    });
    deleteAccount.mutate(IntegratedApps.googlesheet);
  };
  if (!googleAccessToken)
    return (
      <Center h={"80vh"}>
        <Stack align="center" justify="center">
          <Image src={"../../images/googlesheeticon.png"} h={100} w={80} />
          <RateupButtonPrimary
            title="Sync Google Account"
            onClick={() => {
              setCallBackRoute("/dashboard/apps&services/googlesheet");
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
      <Title order={3}>Google Sheet Config</Title>
      <PaperLayout>
        <Flex justify="space-between">
          {googleAccessToken?.credential?.userEmail && (
            <Stack w={"40%"}>
              <Title order={4}> Synced account info</Title>
              <ContainedTextField
                value={googleAccessToken?.credential?.userEmail}
                disabled
                label={"Email Address"}
              />
            </Stack>
          )}
          <RateupButtonPrimary
            title="Sign out of google synced account"
            onClick={alertModalOpen}
          />
        </Flex>
        <ConfirmationModal
          opened={alertModalOpened}
          onClose={alertModalClose}
          headerTitle="Sign out"
          headerLabel="Are you sure you want to sign out from the synced account?"
          confirmLabel="Yes"
          onConfirm={handleSignOutGoogleSync}
        />
      </PaperLayout>
    </Stack>
  );
};

export default GoogleSheet;
