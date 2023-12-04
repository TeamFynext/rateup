import { Button, Group, Stack, TextInput, Title } from "@mantine/core";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { useState } from "react";
import { GoogleIcon } from "../../../components/Button/GoogleIcon";
import { IconArrowRight, IconHelp } from "@tabler/icons-react";
import { TeamSelector } from "../../../components/input/TeamSelector";
import { initGoogleReviews } from "../../../backend/reputation_management/review/review.api";
import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import { useRouter } from "next/router";

export default function () {
  const [dataId, setDataId] = useState<string>(null);
  const [teamId, setTeamId] = useState<string>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  function handleFetch() {
    if (!dataId || !teamId) {
      showErrorToast("Please select a team and enter a data id.");
      return;
    }
    setLoading(true);
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
              value={dataId}
              onChange={(e) => setDataId(e.currentTarget.value)}
              label="Data ID"
              placeholder="Enter Data ID of the location in Google Maps"
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
            <Button variant="outline" loading={loading} onClick={handleFetch}>
              {loading ? "Fetching..." : "Fetch"}
            </Button>
          </Group>
        </Stack>
      </PaperLayout>
    </Stack>
  );
}
