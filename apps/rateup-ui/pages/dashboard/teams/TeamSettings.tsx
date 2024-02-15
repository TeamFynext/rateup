import React, { useState, useEffect } from "react";
import {
  Dialog,
  Stack,
  Text,
  Grid,
  Group,
  useMantineTheme,
  TagsInput,
  Title,
  Kbd,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../../../components/Button/RateupButtons";
import {
  useDeleteTeamMutation,
  useEditTeamMutation,
} from "../../../backend/team/team.query";
import { getHotkeyHandler, useDisclosure } from "@mantine/hooks";
import { deleteTeamById, editTeam } from "../../../backend/team/team.api";
import { notifications } from "@mantine/notifications";
import DangerZone from "../../../components/DangerZone/DangerZone";
import Heading from "../../../components/styled/Heading/Heading";
import { ContainedTextField } from "../../../components/input/ContainedInput/ContainedInput";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { GoogleIcon } from "../../../components/Button/GoogleIcon";
import { showErrorToast } from "../../../utils/notifications";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";
import { SAVE_HOTKEY } from "../../../utils/constants";

export interface ITeamData {
  name: string;
  googleLink: string;
  code: string;
  id: string;
  tags: string[];
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
          <form
            onSubmit={teamForm.onSubmit(onSubmit)}
            onKeyDown={getHotkeyHandler([
              [SAVE_HOTKEY, (event: any) => teamForm.onSubmit(onSubmit)(event)],
            ])}
          >
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
            <Grid justify="flex-end" pt="xl" pb={"5px"}>
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
        <TagSettings tags={teamData?.tags} teamId={id} />
        <DangerZone
          title={"Delete Team"}
          message="Are you sure to delete this team?"
          onClick={toggle}
          buttonText={"Delete Team"}
        />
        <ConfirmationModal
          forDeleteFunctionality
          includeEmailConfirmation
          deleteQuotion="All the associated enities including Team Members, Survey Responses and Menus will be deleted"
          opened={opened}
          onClose={close}
          onConfirm={(e) => {
            setDeleteTeamId(teamData?.id);
          }}
          confirmLabel="Delete"
          headerLabel="Are you sure to delete this team?"
          headerTitle="Delete Team"
        />
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
          <Grid justify="flex-end" pt="xl" pb={"5px"}>
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

export function TagSettings({
  teamId,
  tags,
  onlyform = false,
  surveyId,
}: {
  teamId: string;
  tags: string[];
  onlyform?: boolean;
  surveyId?: string;
}) {
  const form = useForm({
    initialValues: {
      tags: tags || [],
    },
    validate: {
      tags: (value) => {
        if (value.length === 0) return "Enter a tag";
        if (new Set(value).size !== value.length) {
          return `Duplicate tags not allowed`;
        }
        if (value.filter((tag) => tag.includes(";")).length > 0) {
          return `tags can only contain _ or - or alphanumeric characters`;
        }
      },
    },
    onValuesChange: (values) => {
      if (values.tags.length > 0) {
        values.tags = values.tags.map((tag) => tag.toUpperCase());
      }
    },
  });
  const editTeamMutation = useEditTeamMutation(
    teamId,
    () => {},
    surveyId,
    true,
  );
  function handleTagAdd() {
    const res = form.validate();
    if (res.hasErrors) {
      showErrorToast(res.errors.tags.toString(), "tag-exists-error");
      return;
    }
    editTeamMutation.mutate(form.values);
  }
  return (
    <Stack>
      {!onlyform && (
        <Heading subtitle="URL Tagger" label="Add tags to your team" />
      )}
      <PaperLayout>
        <Stack align="center">
          <Title order={4} mr={"auto"}>
            Add Tags
          </Title>
          <Stack gap={0} w={"100%"}>
            <TagsInput
              w={"100%"}
              radius={"md"}
              value={form.values.tags}
              onChange={(values) => form.setValues({ tags: values })}
            />
            <Text size="xs">
              press <Kbd size="xs">Enter</Kbd> to add multiple tags
            </Text>
          </Stack>
          <RateupButtonBlue
            title="Save"
            onClick={handleTagAdd}
            variant="outline"
          />
        </Stack>
      </PaperLayout>
    </Stack>
  );
}
