import { Badge, Divider, Group, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  useGetGoogleAccessToken,
  useDeleteAuthToken,
  useGetAuthorizationUrl,
} from "../../../backend/org/org.query";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";
import useLocalStorage from "../../../hooks/localStorage";
import { notifications } from "@mantine/notifications";
import ETESettings from "./EteSettings";
import ApiAccessKeyPage from "../../../components/ExternalApi/ApiAccessKey";

const AdvancedSettings = () => {
  const [alertModalOpened, { open: alertModalOpen, close: alertModalClose }] =
    useDisclosure(false);
  const { data: googleAuthAccessToken, isFetched } = useGetGoogleAccessToken();
  const deleteAuthTokenMutation = useDeleteAuthToken();
  const { data: authUrl } = useGetAuthorizationUrl();

  const [callbackRoute, setCallBackRoute] = useLocalStorage(
    "google-callback-route",
    "/dashboard/settings",
  );

  const handleSignOutGoogleSync = () => {
    notifications.show({
      id: "load-data",
      loading: true,
      title: "Signing out from google sheet",
      message: `Hold on, Signing out from google sheet..`,
      autoClose: false,
      withCloseButton: false,
    });
    deleteAuthTokenMutation.mutate(null, {});
  };
  return (
    <Stack>
      <Stack>
        {isFetched ? (
          <>
            <Title order={3}>Sync with Google Sheet</Title>
            <Divider />
            <Stack pb={"md"}>
              <Group>
                <Text size="lg" fw={500}>
                  Current Status:
                </Text>
                <Badge
                  color={googleAuthAccessToken.isExist ? "green" : "red"}
                  fw={"bold"}
                  variant="light"
                >
                  {googleAuthAccessToken?.isExist ? "Active" : "Inactive"}
                </Badge>
              </Group>
              <Stack>
                {!googleAuthAccessToken?.isExist ? (
                  <Stack w={250}>
                    <RateupButtonPrimary
                      title="Sync Account"
                      onClick={() => {
                        setCallBackRoute(
                          `/dashboard/settings?activeTab=advanced`,
                        );
                        window.open(authUrl);
                      }}
                    />
                  </Stack>
                ) : (
                  <Stack w={320}>
                    {googleAuthAccessToken?.auth?.userEmail ? (
                      <>
                        <Title order={4}> Synced account info</Title>
                        <Group justify="space-between">
                          <Text>Email Address:</Text>
                          <Text>{googleAuthAccessToken.auth.userEmail}</Text>
                        </Group>
                      </>
                    ) : null}
                    <RateupButtonPrimary
                      title="Sign out of google synced account"
                      onClick={alertModalOpen}
                    />
                  </Stack>
                )}
                <ConfirmationModal
                  opened={alertModalOpened}
                  onClose={alertModalClose}
                  headerTitle="Sign out"
                  headerLabel="Are you sure you want to sign out from the synced account?"
                  confirmLabel="Yes"
                  onConfirm={handleSignOutGoogleSync}
                />
              </Stack>
            </Stack>
          </>
        ) : null}
      </Stack>
      <Divider />
      <ETESettings />
      <Divider />
      <ApiAccessKeyPage />
    </Stack>
  );
};

export default AdvancedSettings;
