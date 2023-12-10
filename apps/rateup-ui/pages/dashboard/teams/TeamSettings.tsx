import React, { useState, useEffect } from "react";
import {
  Dialog,
  Stack,
  Text,
  Grid,
  Group,
  useMantineTheme,
  TagsInput,
  Badge,
  Title,
  Kbd,
  ActionIcon,
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
import { useDisclosure } from "@mantine/hooks";
import { deleteTeamById, editTeam } from "../../../backend/team/team.api";
import { notifications } from "@mantine/notifications";
import DangerZone from "../../../components/DangerZone/DangerZone";
import Heading from "../../../components/styled/Heading/Heading";
import { ContainedTextField } from "../../../components/input/ContainedInput/ContainedInput";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { GoogleIcon } from "../../../components/Button/GoogleIcon";
import { showErrorToast } from "../../../utils/notifications";
import SimpleModalLayout from "../../../components/Modal/SimpleModalLayout";
import { produce } from "immer";
import { IconEdit, IconTrash } from "@tabler/icons-react";

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
        <TagSettings tags={teamData?.tags} teamId={id} />
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
  const [opened, { toggle, close, open }] = useDisclosure(false);
  const form = useForm({
    initialValues: {
      tags: [],
    },
    validate: {
      tags: (value) => {
        if (value.length === 0) return "Enter a tag";
        if (value.some((element) => tags.includes(element))) {
          return `Tag already exists`;
        }
      },
    },
  });
  const editTeamMutation = useEditTeamMutation(teamId, () => {}, surveyId);
  function handleTagAdd() {
    const res = form.validate();
    if (res.hasErrors) {
      showErrorToast(res.errors.tags.toString(), "tag-exists-error");
      return;
    }
    editTeamMutation.mutate(form.values);
    form.reset();
  }
  return (
    <Stack>
      {!onlyform && (
        <Heading subtitle="URL Tagger" label="Add tags to your team" />
      )}
      <PaperLayout>
        <Stack>
          <Group align="flex-start">
            <Title order={4}>Add Tags</Title>
            <Stack gap={0} maw={200}>
              <TagsInput
                maw={200}
                radius={"md"}
                value={form.values.tags}
                onChange={(values) => form.setValues({ tags: values })}
              />
              <Text size="xs">
                press <Kbd size="xs">Enter</Kbd> to add multiple tags
              </Text>
            </Stack>
            <RateupButtonBlue title="Add" onClick={handleTagAdd} />
          </Group>
          {!onlyform && tags.length > 0 && (
            <>
              <Group justify="space-between">
                <Title order={4}>Tags</Title>
                <RateupButtonBlue
                  variant="subtle"
                  title="View All"
                  onClick={open}
                  disabled={tags.length < 7}
                />
              </Group>
              <SimpleModalLayout
                opened={opened}
                onClose={close}
                title="All tags"
                size="lg"
                centered
              >
                <Group p={"lg"}>
                  <TagGroup tags={tags} teamId={teamId} surveyId={surveyId} />
                </Group>
              </SimpleModalLayout>
              <TagGroup
                tags={tags.slice(0, 6)}
                teamId={teamId}
                surveyId={surveyId}
              />
            </>
          )}
        </Stack>
      </PaperLayout>
    </Stack>
  );
}

function TagGroup({
  tags,
  teamId,
  surveyId,
}: {
  tags: string[];
  teamId: string;
  surveyId: string;
}) {
  const [tagsToMap, setTagsToMap] = useState<Array<string>>(tags);
  const editTeamMutation = useEditTeamMutation(
    teamId,
    () => {},
    surveyId,
    true,
  );
  function handleSave() {
    editTeamMutation.mutate({ tags: tagsToMap });
  }
  useEffect(() => {
    setTagsToMap(tags);
  }, [tags]);
  return (
    <Stack>
      <Group gap={"xl"}>
        {tagsToMap?.map((tag, i) => (
          <SingleTag
            key={i}
            tag={tag}
            setTagsToMap={setTagsToMap}
            tagsToMap={tagsToMap}
          />
        ))}
      </Group>
      {JSON.stringify(tags) !== JSON.stringify(tagsToMap) && (
        <Group justify="flex-end">
          <RateupButtonBlue
            title="Discard Changes"
            onClick={() => setTagsToMap(tags)}
            color="red"
          />
          <RateupButtonBlue title="Save Changes" onClick={handleSave} />
        </Group>
      )}
    </Stack>
  );
}

export function SingleTag({
  tag,
  tagsToMap,
  setTagsToMap,
}: {
  tag: string;
  tagsToMap: string[];
  setTagsToMap: (value: Array<string>) => void;
}) {
  const [editWindowOpened, { open: openEditWindow, close: closeEditWindow }] =
    useDisclosure(false);
  enum action {
    "EDIT",
    "DELETE",
  }
  function editorDeleteTag(tag: string, action: action) {
    const updatedArray = produce(tagsToMap, (draft) => {
      if (action === 0) {
        const index = draft.indexOf(tag);
        draft[index] = editForm.values.tag;
      } else {
        const index = draft.indexOf(tag);
        draft.splice(index, 1);
      }
    });
    setTagsToMap(updatedArray);
  }
  const editForm = useForm({
    validateInputOnChange: true,
    initialValues: {
      tag: tag,
    },
    validate: {
      tag: (value) => {
        if (value.length === 0) return "Enter a tag";
        if (tagsToMap.includes(value)) {
          return `Tag already exists`;
        }
      },
    },
  });
  return (
    <Group gap={5}>
      <Badge variant="outline">{tagsToMap.indexOf(tag) + 1}</Badge>
      <Badge miw={140} size="xl" variant="light" px={"xl"} py={"lg"}>
        {tag}
      </Badge>
      <Stack gap={2}>
        <ActionIcon
          variant="outline"
          color="blue"
          radius={"50%"}
          p={2}
          size={20}
          onClick={() => {
            openEditWindow();
          }}
        >
          <IconEdit />
        </ActionIcon>
        <ActionIcon
          variant="outline"
          color="red"
          radius={"50%"}
          p={2}
          size={20}
          onClick={() => {
            editorDeleteTag(tag, action.DELETE);
          }}
        >
          <IconTrash />
        </ActionIcon>
      </Stack>
      <SimpleModalLayout
        key={"form-for-tag-edit"}
        onClose={closeEditWindow}
        opened={editWindowOpened}
        centered
        title="Edit tag"
        size="md"
      >
        <ContainedTextField {...editForm.getInputProps("tag")} mih={70} />
        <RateupButtonBlue
          disabled={editForm.errors.tag ? true : false}
          title="Save"
          onClick={() => {
            editorDeleteTag(tag, action.EDIT);
            closeEditWindow();
          }}
        />
      </SimpleModalLayout>
    </Group>
  );
}
