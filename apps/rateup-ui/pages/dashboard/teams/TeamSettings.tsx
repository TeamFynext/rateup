import React, { useState, useEffect } from "react";
import {
  Dialog,
  Stack,
  Text,
  Grid,
  Group,
  Button,
  useMantineTheme,
  Badge,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../../../components/Button/RateupButtons";
import {
  useDeleteTeamMutation,
  useEditTeamMutation,
} from "../../../backend/team/team.query";
import { useDisclosure } from "@mantine/hooks";
import { deleteTeamById, editTeam } from "../../../backend/team/team.api";
import { notifications } from "@mantine/notifications";
import DangerZone from "../../../components/DangerZone/DangerZone";
import Heading from "../../../components/styled/Heading/Heading";
import { ContainedTextField } from "../../../components/input/ContainedInput/ContainedInput";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { ReviewSuggestionModal } from "../../../components/reviewSuggestion/ReviewSuggestionModal";
import { GoogleIcon } from "../../../components/Button/GoogleIcon";
import { useReviewSuggestionsCount } from "../../../backend/team/reviewSuggestion/reviewSuggestion.query";

export interface ITeamData {
  name: string;
  googleLink: string;
  code: string;
  id: string;
}

const TeamSettings = ({
  id,
  teamData,
}: {
  id: string;
  teamData: ITeamData;
}) => {
  const teamForm = useForm({
    initialValues: {
      name: "",
      code: "",
    },
    validate: {
      name: (value) => {
        if (value.length < 4) {
          return "Name should be min 4 characters";
        }
        return null; // Validation passed
      },
      code: (value) => {
        if (value.length < 2) {
          return "Code should be min 3 characters";
        }
        return null; // Validation passed
      },
    },
  });

  useEffect(() => {
    if (teamData?.name) {
      teamForm.setValues({
        name: teamData?.name || "",
        code: teamData?.code || "",
      });
    }
  }, [teamData]);

  const [isLoading, setIsLoading] = useState(false);
  const editTeam = useEditTeamMutation(id, setIsLoading);
  const onSubmit = (values) => {
    setIsLoading(true);
    const data = {
      name: values.name,
      code: values.code,
    };
    editTeam.mutate(data);
  };

  const [opened, { toggle, close }] = useDisclosure(false);

  const [deleteTeamId, setDeleteTeamId] = useState<string>();
  useEffect(() => {
    deleteTeamId && deleteTeamMutation.mutate();
    if (deleteTeamId) {
      notifications.show({
        id: "load-data",
        loading: true,
        title: "Deleting Team..",
        message: `Hold on, Your team is getting deleted.`,
        autoClose: false,
        withCloseButton: false,
      });
    }
  }, [deleteTeamId]);

  const handleDeleteTeam = async () => {
    return deleteTeamById(deleteTeamId);
  };

  const deleteTeamMutation = useDeleteTeamMutation(handleDeleteTeam);

  return (
    <>
      <Stack p={10}>
        <Heading
          subtitle="Team information"
          label="Update your team information"
        />
        <PaperLayout>
          <form onSubmit={teamForm.onSubmit(onSubmit)}>
            <Grid align="center">
              <Grid.Col span={{ md: 6, lg: 4 }}>
                <Text size={"md"}>Team Name: </Text>
              </Grid.Col>
              <Grid.Col span={{ md: 6, lg: 4 }}>
                <ContainedTextField
                  placeholder="Enter team name"
                  required
                  mt="md"
                  {...teamForm.getInputProps("name")}
                />
              </Grid.Col>
            </Grid>
            <Grid align="center">
              <Grid.Col span={{ md: 6, lg: 4 }}>
                <Text size={"md"}>Team Code: </Text>
              </Grid.Col>
              <Grid.Col span={{ md: 6, lg: 4 }}>
                <ContainedTextField
                  placeholder="Enter team code"
                  required
                  mt="md"
                  {...teamForm.getInputProps("code")}
                />
              </Grid.Col>
            </Grid>
            <Grid justify="flex-end" pt="xl">
              <Grid.Col span={2}>
                <RateupButtonSecondary
                  type="submit"
                  loading={isLoading}
                  title="Save Changes"
                  color="var(--tertiary-color)"
                />
              </Grid.Col>
              <Grid.Col span={5}></Grid.Col>
            </Grid>
          </form>
        </PaperLayout>
        <GoogleReviewSettings googleLink={teamData.googleLink} teamId={id} />
        <DangerZone
          title={"Delete Team"}
          message="Are you sure to delete this team?"
          onClick={toggle}
          buttonText={"Delete Team"}
        />
        <Dialog
          opened={opened}
          withCloseButton
          onClose={close}
          size="lg"
          radius="md"
          position={{ top: "0", left: "40vw" }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Text size="md" mb="xs" fw={500}>
            Are you sure to delete this team?
          </Text>

          <Group align="center" pt="lg">
            <RateupButtonSecondary
              onClick={close}
              loading={isLoading}
              size="md"
              title="Cancel"
            />

            <RateupButtonPrimary
              onClick={() => {
                close();
                setDeleteTeamId(teamData?.id);
              }}
              loading={isLoading}
              size="md"
              title="Yes, Delete"
            />
          </Group>
        </Dialog>
      </Stack>
    </>
  );
};

export default TeamSettings;
function GoogleReviewSettings({ teamId, googleLink }) {
  const theme = useMantineTheme();
  const form = useForm({
    initialValues: {
      googleLink: googleLink || "",
    },
    validate: {
      googleLink: (value) =>
        value.startsWith("https://") || value === ""
          ? null
          : "Please enter a valid url (https://...)",
    },
  });

  useEffect(() => {
    if (googleLink) {
      form.setValues({
        googleLink: googleLink,
      });
    }
  }, [googleLink]);

  const [
    reviewModalOpened,
    { open: openReviewModal, close: closeReviewModal },
  ] = useDisclosure(false);

  const { data: count } = useReviewSuggestionsCount(!!teamId, teamId);
  const editTeamMutation = useEditTeamMutation(teamId, () => {});

  function handleSave() {
    const res = form.validate();
    if (res.hasErrors) {
      return;
    }
    editTeamMutation.mutate(form.values);
  }

  return (
    <>
      <Group gap={"xs"}>
        <GoogleIcon width={"1.3rem"} height={"1.3rem"} />
        <Heading
          subtitle="Google Review"
          titleprops={{ c: theme.colors.dark[5] }}
        />
      </Group>
      <Heading label="Add review link & suggestions" />
      <PaperLayout>
        <>
          <Grid align="center">
            <Grid.Col span={{ md: 6, lg: 4 }}>
              <Text size={"md"}>Google Reviews Link: </Text>
            </Grid.Col>
            <Grid.Col span={{ md: 6, lg: 4 }}>
              <ContainedTextField
                placeholder="Enter google url"
                mt="md"
                {...form.getInputProps("googleLink")}
              />
            </Grid.Col>
          </Grid>

          <Grid>
            <Grid.Col span={2}>
              <Button variant="light" onClick={openReviewModal}>
                Manage review suggestions
                <Badge ml="xs">{count}</Badge>
              </Button>
            </Grid.Col>
          </Grid>
          <ReviewSuggestionModal
            teamId={teamId}
            opened={reviewModalOpened}
            onClose={closeReviewModal}
          />
          <Grid justify="flex-end" pt="xl">
            <Grid.Col span={2}>
              <RateupButtonSecondary
                onClick={handleSave}
                loading={editTeamMutation.isPending}
                title="Save Changes"
                color="var(--tertiary-color)"
              />
            </Grid.Col>
            <Grid.Col span={5}></Grid.Col>
          </Grid>
        </>
      </PaperLayout>
    </>
  );
}
