import {
  rem,
  Menu,
  Stack,
  Group,
  ActionIcon,
  Text,
  Radio,
  MultiSelect,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconDots,
  IconPlayerPause,
  IconPlayerPlay,
  IconShare,
  IconCopy,
  IconTrash,
  IconSettings,
} from "@tabler/icons-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  deleteSurvey,
  deleteSurveyForOneTeam,
  updateSurvey,
} from "../../../backend/surveys/survey.api";
import { useCloneSurveyMutation } from "../../../backend/surveys/surveys.query";
import { useForm } from "@mantine/form";
import FormModalLayout from "../../Modal/FormModalLayout";
import ConfirmationModal from "../../Modal/ConfirmationModal";

interface SurveyMenuProps {
  survey: Survey;
  selectedTeamId: string;
  teamsData: any;
}

export function SurveyMenu({
  survey,
  selectedTeamId,
  teamsData,
}: SurveyMenuProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [opened, { close, open }] = useDisclosure(false);
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const [teamChoice, setTeamChoice] = useState("all");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const allTeams = teamsData?.map((team) => team?.id);
  const teamOptions = teamsData?.map((team) => ({
    value: team?.id,
    label: team?.name,
  }));

  const cloneForm = useForm({
    initialValues: {
      teamIds: [],
    },
    validate: {
      teamIds: (values) =>
        values?.length ? null : "Must contain atleast one team",
    },
  });

  useEffect(() => {
    cloneForm.setFieldValue("teamIds", selectedTeams);
  }, [selectedTeams]);

  function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a?.length !== b?.length) return false;

    a.sort();
    b.sort();

    for (let i = 0; i < a?.length; ++i) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  useEffect(() => {
    setSelectedTeams([]);
  }, [teamChoice]);

  useEffect(() => {
    if (
      teamChoice === "all" &&
      !arraysEqual(cloneForm?.values?.teamIds, allTeams)
    ) {
      cloneForm.setFieldValue("teamIds", allTeams);
    }
  }, [allTeams, teamChoice, cloneForm?.values?.teamIds]);

  const onSubmit = (values) => {
    const validationRes = cloneForm.validate();
    if (validationRes.hasErrors) {
      console.error(validationRes.errors);
      return;
    }
    notifications.show({
      id: "load-data",
      loading: true,
      title: "Clonning survey..",
      message: `Hold on, your survey is getting clonned...`,
      autoClose: false,
      withCloseButton: false,
    });
    cloneSurvey.mutate({ id: survey?.id, teamIds: cloneForm.values.teamIds });
  };

  const cloneSurvey = useCloneSurveyMutation({
    close,
    selectedTeamId,
  });

  const surveyDeleteMutation = useMutation({
    mutationFn: ({ id, teamId }: { id: string; teamId?: string }) =>
      selectedTeamId && selectedTeamId !== "all"
        ? deleteSurveyForOneTeam(id, teamId)
        : deleteSurvey(id),
    onSuccess: () => {
      notifications.update({
        id: "delete-data",
        color: "teal",
        title: "Success",
        message: "Deleted Survey Successfully!",
        loading: false,
        icon: <IconCheck style={{ width: rem(18), height: rem(18) }} />,
        autoClose: 2000,
      });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
    onError: (error: any) => {
      //console.error("Error deleting Survey:", error.message);
      notifications.update({
        id: "delete-data",
        loading: false,
        color: "red",
        title: "Delete Failed..!",
        message: error?.response?.data?.error,
        icon: <IconCheck size="1rem" />,
        autoClose: 4000,
      });
    },
  });

  const surveyUpdateMutation = useMutation({
    mutationFn: (data: any) => updateSurvey(survey.id, data),
    onSuccess: () => {
      notifications.show({
        id: "survey",
        message: "Survey status Updated!",
        autoClose: true,
      });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });

  return (
    <Menu width={200}>
      <FormModalLayout
        opened={opened}
        onClose={() => {
          close();
          cloneForm.reset();
        }}
        title={"Clone Survey"}
        centered
        onSubmit={cloneForm.onSubmit(onSubmit)}
        buttonTitle={"Submit"}
        includeCancelButton
      >
        <Stack>
          <Text c="dimmed">
            Select the team/teams in which the survey copy to be created.
          </Text>
          <Group>
            <Radio.Group
              value={teamChoice}
              onChange={setTeamChoice}
              name="selectTeams"
              label="Select teams"
              withAsterisk
            >
              <Group mt="xs">
                <Radio checked label="All teams" value="all" />
                <Radio label="Select Manually" value="manual" />
              </Group>
            </Radio.Group>

            {teamChoice === "manual" && (
              <MultiSelect
                radius="md"
                value={selectedTeams}
                onChange={setSelectedTeams}
                placeholder="Select teams (type in to search)"
                data={teamOptions}
                searchable
                error={cloneForm.errors.teamIds}
                styles={{ root: { width: "100%" } }}
              />
            )}
          </Group>
        </Stack>
      </FormModalLayout>
      <ConfirmationModal
        forDeleteFunctionality
        opened={dialogOpened}
        onClose={closeDialog}
        headerLabel="Are you sure to delete this Survey?"
        headerTitle="Delete Survey?"
        confirmLabel="Delete"
        onConfirm={(e) => {
          e.stopPropagation();
          notifications.show({
            id: "delete-data",
            loading: true,
            title: "Deleting survey..",
            message: `Hold on, survey is getting deleted...`,
            autoClose: false,
            withCloseButton: false,
          });
          selectedTeamId && selectedTeamId !== "all"
            ? surveyDeleteMutation.mutate({
                id: survey?.id,
                teamId: selectedTeamId,
              })
            : surveyDeleteMutation.mutate({ id: survey?.id });
        }}
      />
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <IconDots />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Menu.Item
          leftSection={
            survey?.active ? <IconPlayerPause /> : <IconPlayerPlay />
          }
          onClick={() =>
            surveyUpdateMutation.mutate({ active: !survey?.active })
          }
        >
          {survey?.active ? "Pause Survey" : "Resume Survey"}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconShare />}
          onClick={() => {
            router.push(`${router.pathname}/${survey?.id}?tab=Share`);
          }}
        >
          Share
        </Menu.Item>
        <Menu.Item
          leftSection={<IconCopy />}
          onClick={() => {
            open();
          }}
        >
          Clone
        </Menu.Item>
        <Menu.Item leftSection={<IconTrash />} onClick={toggle}>
          Delete
        </Menu.Item>

        <Menu.Item
          leftSection={<IconSettings />}
          onClick={() => {
            router.push(`${router.pathname}/${survey?.id}?tab=Settings`);
          }}
        >
          Settings
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
