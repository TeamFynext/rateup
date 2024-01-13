import { Button, Divider, Group, Stack, TextInput, Title } from "@mantine/core";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { useState } from "react";
import { GoogleIcon } from "../../../components/Button/GoogleIcon";
import { IconArrowRight, IconHelp } from "@tabler/icons-react";
import { TeamSelector } from "../../../components/input/TeamSelector";
import { initGoogleReviews } from "../../../backend/reputation_management/review/review.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import { useRouter } from "next/router";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";
import { useDisclosure } from "@mantine/hooks";
import { useDeleteAllReviews } from "../../../backend/reputation_management/review/review.query";

export default function () {
  const [url, setUrl] = useState<string>("");
  const [teamId, setTeamId] = useState<string>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const router = useRouter();

  const dataId = getDataIdFromUrl(url);
  const [dialogOpened, { open: openDialog, close: closeDialog }] =
    useDisclosure(false);
  const deleteMutation = useDeleteAllReviews(teamId);

  function handleFetch() {
    if (!url || !teamId || !dataId) {
      showErrorToast("Please select a team and enter url of the place.");
      return;
    }
    initGoogleReviews(teamId, dataId)
      .then((r) => {
        setLoading(false);
        showSuccessToast(
          "Processing reviews. This may take a while. Redirecting to main page...",
        );

        setTimeout(() => {
          router.push(`/dashboard/rm`);
        }, 6000);
      })
      .catch((e) => {
        setLoading(false);
        showErrorToast("Something went wrong while fetching the reviews.");
        console.error(e);
      });
  }

  return (
    <Stack align="end" h="100%">
      <TeamSelector value={teamId} onChange={(teamId) => setTeamId(teamId)} />
      <PaperLayout
        style={{
          flex: 1,
        }}
        h="100%"
      >
        <Stack>
          <Title order={3}>Initialize Review Platform</Title>
          <Group align="end" p="sm">
            <GoogleIcon
              style={{
                scale: "2",
                margin: "12px",
              }}
            />
            <IconArrowRight
              style={{
                marginBottom: "8px",
              }}
            />
            <TextInput
              value={url}
              onChange={(e) => setUrl(e.currentTarget.value)}
              error={
                url && !dataId ? "Please enter a valid Google Maps URL" : false
              }
              label="Place URL"
              placeholder="Enter URL of the location in Google Maps"
              style={{
                width: "400px",
              }}
              rightSection={<IconHelp />}
              rightSectionProps={{
                onClick: () => alert("Can be found in url of the location."),
                style: {
                  cursor: "pointer",
                },
              }}
            />
            <Button
              variant="outline"
              loading={loading}
              onClick={handleFetch}
              disabled={!dataId}
            >
              {loading ? "Fetching..." : "Fetch"}
            </Button>
          </Group>
          <Divider />
          <Button variant="filled" color="red" onClick={openDialog}>
            Delete All Reviews
          </Button>
          <ConfirmationModal
            forDeleteFunctionality
            confirmLabel="Delete"
            headerLabel="Are you sure to delete all reviews?"
            headerTitle="Delete reviews?"
            opened={dialogOpened}
            onClose={closeDialog}
            onConfirm={(e) => {
              deleteMutation.mutate(undefined, {
                onSettled: closeDialog,
              });
            }}
          />
        </Stack>
      </PaperLayout>
    </Stack>
  );
}

function getDataIdFromUrl(url: string): string | undefined {
  const regex = /!1s(.*?)!/;
  const match = url.match(regex);
  if (match && match[1]) {
    return match[1];
  }
}
