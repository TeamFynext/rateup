"use client";

import { useEffect, useState } from "react";

import {
  ActionIcon,
  Group,
  Menu,
  MultiSelect,
  Radio,
  Stack,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCopy,
  IconDots,
  IconPlayerPause,
  IconPlayerPlay,
  IconSettings,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  deleteSurvey,
  deleteSurveyForOneTeam,
  updateSurvey,
} from "@/backend/surveys/survey.api";
import { useCloneSurveyMutation } from "@/backend/surveys/surveys.query";

import ConfirmationModal from "../../Modal/ConfirmationModal.tsx";
import FormModalLayout from "../../Modal/FormModalLayout.tsx";

interface SurveyMenuProps {
  survey: Survey;
  selectedTeamId: string;
  teamsData: any;
  refetchSurveys: any;
}

export function SurveyMenu({
  survey,
  selectedTeamId,
  teamsData,
  refetchSurveys,
}: SurveyMenuProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const { t: translations } = useTranslation();
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
        values?.length ? null : translations("Must contain atleast one team"),
    },
  });

  useEffect(() => {
    cloneForm.setFieldValue("teamIds", selectedTeams);
  }, [selectedTeams]);

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
    toast.loading(translations("Hold on, your survey is getting clonned..."), {
      id: "load-data",
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
      toast.success(translations("Deleted Survey Successfully!"), {
        id: "delete-data",
      });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
    onError: (error) => {
      // console.error("Error deleting Survey:", error.message);
      toast.error(error?.message, {
        id: "delete-data",
      });
    },
  });

  const surveyUpdateMutation = useMutation({
    mutationFn: (data: any) => updateSurvey(survey.id, data),
    onSuccess: () => {
      toast.success(translations("Survey status Updated!"), {
        id: "survey",
      });
      refetchSurveys();
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
        title={translations("Clone Survey")}
        centered
        onSubmit={cloneForm.onSubmit(onSubmit)}
        buttonTitle={translations("Submit")}
        includeCancelButton
      >
        <Stack>
          <Text c="dimmed">
            {translations(
              "Select the team/teams in which the survey copy to be created.",
            )}
          </Text>
          <Group>
            <Radio.Group
              value={teamChoice}
              onChange={(value) => setTeamChoice(value)}
              name="selectTeams"
              label={translations("Select teams")}
              withAsterisk
            >
              <Group mt="xs">
                <Radio checked label={translations("All teams")} value="all" />
                <Radio label={translations("Select Manually")} value="manual" />
              </Group>
            </Radio.Group>

            {teamChoice === "manual" && (
              <MultiSelect
                radius="md"
                value={selectedTeams}
                onChange={setSelectedTeams}
                placeholder={translations("Select teams (type in to search)")}
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
        headerLabel={translations("Are you sure to delete this Survey?")}
        headerTitle={translations("Delete Survey?")}
        confirmLabel={translations("Delete")}
        onConfirm={async (e) => {
          toast.loading(translations("Hold on, survey is getting deleted..."), {
            id: "delete-data",
          });
          selectedTeamId && selectedTeamId !== "all"
            ? await surveyDeleteMutation.mutateAsync({
                id: survey?.id,
                teamId: selectedTeamId,
              })
            : await surveyDeleteMutation.mutateAsync({ id: survey?.id });
          refetchSurveys();
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
          {survey?.active
            ? translations("Pause Survey")
            : translations("Resume Survey")}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconShare />}
          onClick={() => {
            navigate({
              to: `${pathname}/${survey?.id}?tab=Share`,
            });
          }}
        >
          {translations("Share")}
        </Menu.Item>
        <Menu.Item
          leftSection={<IconCopy />}
          onClick={() => {
            open();
          }}
        >
          {translations("Clone")}
        </Menu.Item>
        <Menu.Item leftSection={<IconTrash />} onClick={toggle}>
          {translations("Delete")}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconSettings />}
          onClick={() => {
            navigate({
              to: `${pathname}/${survey?.id}?tab=Settings`,
            });
          }}
        >
          {translations("Settings")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

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
