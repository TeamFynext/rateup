import React, { useState, useEffect } from "react";
import { Dialog, Stack, Text, Grid, Group } from "@mantine/core";
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
import { deleteTeamById } from "../../../backend/team/team.api";
import { notifications } from "@mantine/notifications";
import DangerZone from "../../../components/DangerZone/DangerZone";
import Heading from "../../../components/styled/Heading/Heading";
import { ContainedTextField } from "../../../components/input/ContainedInput/ContainedInput";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";

export interface ITeamData {
  name: string;
  googleLink: string;
  code: string;
  id: string;
  whatsappAccessToken: string;
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
      googleLink: "",
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
      googleLink: (value) => {
        if (value.length < 12) {
          return "Enter valid Google Url: https://....";

          //TODO  - add detailed url validation supporting shortened url
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
        googleLink: teamData?.googleLink || "",
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
      googleLink: values.googleLink,
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
            <Grid align="center">
              <Grid.Col span={{ md: 6, lg: 4 }}>
                <Text size={"md"}>Google Reviews Link: </Text>
              </Grid.Col>
              <Grid.Col span={{ md: 6, lg: 4 }}>
                <ContainedTextField
                  placeholder="Enter google url"
                  required
                  mt="md"
                  {...teamForm.getInputProps("googleLink")}
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
