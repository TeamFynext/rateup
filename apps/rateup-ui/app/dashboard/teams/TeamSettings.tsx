"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  Grid,
  Group,
  Kbd,
  Stack,
  TagsInput,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { getHotkeyHandler, useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";

import { deleteTeamById, editTeam } from "../../../backend/team/team.api";
import {
  useDeleteTeamMutation,
  useEditTeamMutation,
} from "../../../backend/team/team.query";
import { GoogleIcon } from "../../../components/Button/GoogleIcon";
import InfoButton from "../../../components/Button/InfoButton";
import {
  RateupButtonBlue,
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../../../components/Button/RateupButtons";
import DangerZone from "../../../components/DangerZone/DangerZone";
import { ContainedTextField } from "../../../components/input/ContainedInput/ContainedInput";
import ConfirmationModal from "../../../components/Modal/ConfirmationModal";
import Heading from "../../../components/styled/Heading/Heading";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { docsPath, SAVE_HOTKEY } from "../../../utils/constants";
import { showErrorToast } from "../../../utils/notifications";

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
  const router = useRouter();
  const translations = useTranslations();
  const teamForm = useForm({
    initialValues: {
      name: "",
      code: "",
    },
    validate: {
      name: (value) => {
        if (value.length < 4) {
          return translations("Name should be min 4 characters");
        }
        return null; // Validation passed
      },
      code: (value) => {
        if (value.length < 2) {
          return translations("Code should be min 3 characters");
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
    editTeam.mutate(data, {
      onSuccess: (res) => {
        router.push(`/dashboard/teams/${res?.data?.data?.code}`);
      },
    });
  };

  const [opened, { toggle, close }] = useDisclosure(false);
  const deleteTeamMutation = useDeleteTeamMutation();

  const handleDeleteTeam = async (deleteTeamId: string) => {
    notifications.show({
      id: "load-data",
      loading: true,
      title: translations("Deleting Team"),
      message: translations("Hold on, Your team is getting deleted"),
      autoClose: false,
      withCloseButton: false,
    });
    deleteTeamMutation.mutate(deleteTeamId);
  };

  return (
    <Stack p={10}>
      <Group>
        <Heading
          subtitle={translations("Team information")}
          label={translations("Update your team information")}
        />
        <InfoButton docUrl={`${docsPath}/teams/teamSettings`} />
      </Group>
      <PaperLayout>
        <form
          onSubmit={teamForm.onSubmit(onSubmit)}
          onKeyDown={getHotkeyHandler([
            [SAVE_HOTKEY, (event: any) => teamForm.onSubmit(onSubmit)(event)],
          ])}
        >
          <Grid align="center">
            <Grid.Col span={{ md: 6, lg: 4 }}>
              <Text size={"md"}>{translations("Team Name:")} </Text>
            </Grid.Col>
            <Grid.Col span={{ md: 6, lg: 4 }}>
              <ContainedTextField
                placeholder={translations("Enter team name")}
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
                placeholder={translations("Enter team code")}
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
                title={translations("Save Changes")}
                color="var(--tertiary-color)"
              />
            </Grid.Col>
            <Grid.Col span={5}></Grid.Col>
          </Grid>
        </form>
      </PaperLayout>
      <GoogleReviewSettings googleLink={teamData.googleLink} teamId={id} />
      <DangerZone
        title={translations("Delete Team")}
        message={translations("Are you sure to delete this team?")}
        onClick={toggle}
        buttonText={translations("Delete Team")}
      />
      <ConfirmationModal
        forDeleteFunctionality
        includeEmailConfirmation
        deleteQuotion={translations(
          "All the associated enities including Team Staff, Survey Responses and Menus will be deleted",
        )}
        opened={opened}
        onClose={close}
        onConfirm={(e) => {
          handleDeleteTeam(teamData?.id);
        }}
        confirmLabel={translations("Delete")}
        headerLabel={translations("Are you sure to delete this team?")}
        headerTitle={translations("Delete Team")}
      />
    </Stack>
  );
};

export default TeamSettings;
function GoogleReviewSettings({ teamId, googleLink }) {
  const theme = useMantineTheme();
  const translations = useTranslations();
  const form = useForm({
    initialValues: {
      googleLink: googleLink || "",
    },
    validate: {
      googleLink: (value) =>
        value.startsWith("https://") || value === ""
          ? null
          : translations("Please enter a valid url (https://...)"),
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
          subtitle={translations("Google Review")}
          titleprops={{ c: theme.colors.dark[5] }}
        />
      </Group>
      <Heading label={translations("Add review link & suggestions")} />
      <PaperLayout>
        <>
          <Grid align="center">
            <Grid.Col span={{ md: 6, lg: 4 }}>
              <Text size={"md"}>{translations("Google Reviews Link: ")}</Text>
            </Grid.Col>
            <Grid.Col span={{ md: 6, lg: 4 }}>
              <ContainedTextField
                placeholder={translations("Enter google url")}
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
                title={translations("Save Changes")}
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
  const translations = useTranslations();
  const form = useForm({
    initialValues: {
      tags: tags || [],
    },
    validate: {
      tags: (value) => {
        if (value.length === 0) return "Enter a tag";
        if (new Set(value).size !== value.length) {
          return translations("Duplicate tags not allowed");
        }
        if (value.filter((tag) => tag.includes(";")).length > 0) {
          return translations(
            "tags can only contain _ or - or alphanumeric characters",
          );
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
        <Heading
          subtitle={translations("URL Tagger")}
          label={translations("Add tags to your team")}
        />
      )}
      <PaperLayout>
        <Stack align="center">
          <Title order={4} mr={"auto"}>
            {translations("Add Tags")}
          </Title>
          <Stack gap={0} w={"100%"}>
            <TagsInput
              w={"100%"}
              radius={"md"}
              value={form.values.tags}
              onChange={(values) => form.setValues({ tags: values })}
            />
            <Text size="xs">
              {translations("press")}{" "}
              <Kbd size="xs">{translations("Enter")}</Kbd>{" "}
              {translations("to add multiple tags")}
            </Text>
          </Stack>
          <RateupButtonBlue
            title={translations("Save")}
            onClick={handleTagAdd}
            variant="outline"
          />
        </Stack>
      </PaperLayout>
    </Stack>
  );
}
