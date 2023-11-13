import {
  rem,
  Menu,
  Modal,
  Stack,
  Group,
  Dialog,
  ActionIcon,
  Text,
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
import { useState } from "react";
import {
  deleteSurvey,
  deleteSurveyForOneTeam,
  updateSurvey,
} from "../../../backend/surveys/survey.api";
import { useCloneSurveyMutation } from "../../../backend/surveys/surveys.query";
import {
  RateupButtonSecondary,
  RateupButtonPrimary,
} from "../../Button/RateupButtons";
import { TeamSelector } from "../../input/TeamSelector";

interface SurveyMenuProps {
  survey: Survey;
  selectedTeamId: string;
}

export function SurveyMenu({ survey, selectedTeamId }: SurveyMenuProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [opened, { close, open }] = useDisclosure(false);
  const [dialogOpened, { toggle, close: closeDialog }] = useDisclosure(false);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedTeamID, setSelectedTeamID] = useState("");
  const cloneSurvey = useCloneSurveyMutation({
    close,
    selectedTeamID,
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
      console.error("Error deleting Survey:", error.message);
      notifications.update({
        id: "load-data",
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
      <Modal
        size="sm"
        centered
        opened={opened}
        onClose={close}
        title={<h2>Clone Survey</h2>}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <Stack>
          <Text pr="xl" c="dark.2">
            Select the team in which the copy to be created.
          </Text>
          <Group mt="md" style={{ minHeight: "200px" }}>
            <TeamSelector
              label="Select Team"
              value={selectedTeamID}
              onChange={setSelectedTeamID}
            />
          </Group>
          <Group mt="xl">
            <RateupButtonSecondary title="Cancel" onClick={close} />
            <RateupButtonPrimary
              title="Submit"
              onClick={() => {
                cloneSurvey.mutate({ id: survey?.id, teamId: selectedTeamID });
              }}
            />
          </Group>
        </Stack>
      </Modal>

      <Dialog
        opened={dialogOpened}
        withCloseButton
        onClose={closeDialog}
        size="lg"
        radius="md"
        position={{ top: "0", left: "40vw" }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Text size="md" mb="xs" fw={500}>
          Are you sure to delete this Survey?
        </Text>

        <Group align="center" pt="lg">
          <RateupButtonSecondary
            onClick={(e) => {
              e.stopPropagation();
              closeDialog();
            }}
            loading={isLoading}
            size="md"
            title="Cancel"
          />

          <RateupButtonPrimary
            onClick={(e) => {
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
            loading={isLoading}
            size="md"
            title="Yes, Delete"
          />
        </Group>
      </Dialog>

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
