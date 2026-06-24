import {
  ActionIcon,
  Avatar,
  Badge,
  Container,
  Flex,
  Group,
  Loader,
  Menu,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Space,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChartBar,
  IconCopy,
  IconDots,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconSelector,
  IconSettings,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { deleteSurvey, updateSurvey } from "@/backend/surveys/survey.api";
import { useSurveysBylandingId, useSurveysByTeam } from "@/backend/surveys/surveys.query";
import { useTeamsByUser } from "@/backend/team/team.query";
import { RateupButtonPrimary, RateupButtonSecondary } from "@/components/Button/RateupButtons.tsx";
import { CreateSurveyModal } from "@/components/Survey/CreateSurveyModal.tsx";
import { useUser } from "@/context/UserContext.tsx";
import { getTimeSince } from "@/utils/index.ts";

// ------------get all surveys under this landing id -----------
export default function LandingSurveysList() {
  const [createSurveyOpened, { close }] = useDisclosure(false);
  const [sort, setSort] = useState(false);
  const { t: translations } = useTranslation();
  const searchParams = useSearch({ strict: false });
  const LandingId = searchParams.LandingId;

  const [options, setOptions] = useState([
    {
      value: "all",
      label: "All Teams",
    },
  ]);
  const [selectedTeamId, setSelectedTeamId] = useState(options[0].value);

  const specificTeamIsSelected = selectedTeamId !== "all";
  // ---------check not array ------------
  if (Array.isArray(LandingId)) {
    throw new Error(translations("surveyId is an array"));
  }

  const { isLoading, error, data: surveys } = useSurveysBylandingId(LandingId);
  const queryClient = useQueryClient();

  const { data: teamRes } = useTeamsByUser();

  useEffect(() => {
    if (selectedTeamId !== null) {
      queryClient.invalidateQueries({
        queryKey: ["surveysByTeam", selectedTeamId],
      });
    }
  }, [selectedTeamId, queryClient]);

  const { data: teamsDataUser } = useTeamsByUser() as UseTeamsByUserResult;

  const teamsData = teamsDataUser?.data;

  const { data: surveysByTeam } = useSurveysByTeam(selectedTeamId, specificTeamIsSelected);

  useEffect(() => {
    if (teamsData?.length) {
      const newOptions = teamsData?.map((team) => ({
        value: team?.id,
        label: team?.name,
      }));

      setOptions((prev) => {
        const uniqueValues = new Set(prev.map((option) => option.value));
        const nonDuplicateOptions = newOptions.filter((option) => !uniqueValues.has(option.value));
        return [...prev, ...nonDuplicateOptions];
      });
    }
  }, [teamsData]);

  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: ["surveysByTeam", selectedTeamId],
    });
  }, [selectedTeamId]);

  if (isLoading) return <Loader type="bars" />;
  if (error || !Array.isArray(surveys)) {
    console.error(surveys, error);
    return <>{translations("An error has occurred")}</>;
  }

  return (
    <Container fluid>
      <Flex mih={50} gap="md" justify="space-between" align="center" direction="row" wrap="wrap">
        <Flex
          mih={50}
          gap="md"
          justify="flex-start"
          align="center"
          direction="row"
          wrap="wrap"
          mb="md"
        >
          <Title order={5}>
            {translations("survey list under: ")}
            {LandingId}{" "}
          </Title>

          <Select
            mt="xs"
            data={options}
            defaultValue={options[0].value}
            value={selectedTeamId}
            onChange={(value) => setSelectedTeamId(value)}
          />
        </Flex>

        <Flex mih={50} gap="md" justify="flex-start" align="flex-start" direction="row" wrap="wrap">
          <Menu shadow="md" width={200} position="bottom-end" offset={2}>
            {/* <Menu.Target>
              <RateupButtonPrimary
                title={"Status"}
                variant="subtle"
                rightIcon={<IconChevronDown size="1rem" />}
              />
            </Menu.Target> */}
            {/*
              <Menu.Dropdown >
                <Menu.Item color="teal" icon={<IconCheck size={14} />}>Active</Menu.Item>
                <Menu.Item color="red" icon={<IconX size={14} />}>Inactive</Menu.Item>
              </Menu.Dropdown>
               */}
          </Menu>

          <RateupButtonPrimary
            onClick={() => setSort(!sort)}
            title={translations("Sort")}
            variant="subtle"
            rightIcon={<IconSelector size="1rem" />}
          />
        </Flex>
      </Flex>
      <Space h="xl" />
      <SimpleGrid spacing={"lg"} cols={{ base: 4, sm: 1, md: 2, lg: 2, xl: 3 }}>
        {(specificTeamIsSelected
          ? surveysByTeam?.length > 0
            ? [...surveysByTeam]
            : []
          : [...surveys]
        )
          ?.slice()
          ?.sort((a, b) =>
            sort
              ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          )
          ?.map((s) => (
            <SurveyCard key={s.id} survey={s} teamsData={teamsData} />
          ))}
      </SimpleGrid>
      <CreateSurveyModal
        open={createSurveyOpened}
        close={close}
        surveyType={"web"}
        teamsData={teamRes?.data}
      />
    </Container>
  );
}

// ---------------survey card section starts --------------
interface SurveyCardProps {
  survey: Survey;
}
function SurveyCard({ survey, teamsData }: SurveyCardProps & { teamsData: any }): JSX.Element {
  const [timeSince, setTimeSince] = useState("");
  const { user } = useUser();
  const { t: translations } = useTranslation();
  useEffect(() => {
    setTimeSince(getTimeSince(survey.createdAt));
    const timeoutID = setInterval(() => setTimeSince(getTimeSince(survey.createdAt)), 5000);
    return () => clearInterval(timeoutID);
  }, []);

  const navigate = useNavigate();

  return (
    <Paper
      p="md"
      shadow="lg"
      radius="lg"
      style={{ cursor: "pointer" }}
      onClick={() => {
        user?.role === "MEMBER"
          ? navigate({
              to: `${import.meta.env.VITE_FRONTEND_URL}/dashboard/surveys/responses/${survey?.id}`,
            })
          : navigate({
              to: `${import.meta.env.VITE_FRONTEND_URL}/dashboard/surveys/${survey?.id}`,
            });
      }}
    >
      <Flex justify={"space-between"} align={"center"}>
        <Text mr={"sm"} truncate size="xl" fw={500}>
          {survey.title}
        </Text>
        <Badge color={survey?.type == "web" ? "blue" : "green"}>{survey.type}</Badge>
        <Group align={"center"} mt="sm" gap="xs">
          <IconPencil />
          <SurveyMenu survey={survey} teamsData={teamsData} />
        </Group>
      </Flex>
      <Group align={"center"} mt="sm" gap="xs">
        <Avatar radius={"xl"} />
        <Text size="sm" c="dimmed">
          {translations("Created")} {timeSince}
        </Text>
      </Group>
      <Space h="xl" />
      <Space h="lg" />
      <Flex justify={"space-between"} mt="xl" align={"center"}>
        <StatusBadge active={survey.active} />
        {/* <Text>Total Responses : #</Text> */}
        {/* //TODO */}
        <Link
          to={`/dashboard/surveys/${survey?.id}?tab=Responses`}
          style={{ color: "var(--tertiary-color)" }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Group gap="4px">
            <IconChartBar size={20} />
            <Text>{translations("Responses")}</Text>
          </Group>
        </Link>
      </Flex>
    </Paper>
  );
}
interface SurveyMenuProps {
  survey: Survey;
  teamsData: TeamData[];
}
function SurveyMenu({ survey, teamsData }: SurveyMenuProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t: translations } = useTranslation();
  const [opened, { close, open }] = useDisclosure(false);
  const [selectedTeamID, setSelectedTeamID] = useState("");

  const [options, setOptions] = useState([]);

  useEffect(() => {
    const newOptions = teamsData?.map((team) => ({
      value: team?.id,
      label: team?.name,
    }));

    setOptions(newOptions);
  }, [teamsData]);

  const surveyDeleteMutation = useMutation({
    mutationFn: deleteSurvey,
    onSuccess: () => {
      toast.success("Deleted!");
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["surveysByTeam"] });
    },
  });

  const surveyUpdateMutation = useMutation({
    mutationFn: (data: any) => updateSurvey(survey.id, data),
    onSuccess: () => {
      toast.success(translations("Survey status Updated!"), {
        id: "survey",
      });
      queryClient.invalidateQueries({ queryKey: ["surveys"] });
      queryClient.invalidateQueries({ queryKey: ["surveysByTeam"] });
    },
  });

  return (
    <Menu width={200}>
      <Modal
        size="sm"
        centered
        opened={opened}
        onClose={close}
        title={<h2>{translations("Clone Survey")}</h2>}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <Stack>
          <Text pr="xl" c="dark.2">
            {translations("Select the team in which the copy to be created.")}
          </Text>
          <Group mt="md" style={{ minHeight: "200px" }}>
            <Select
              label={translations("Select Team")}
              maxDropdownHeight={150}
              mt="xs"
              placeholder={translations("Pick one")}
              data={options}
              value={selectedTeamID}
              onChange={(value) => setSelectedTeamID(value)}
              onClick={(event) => {
                event.stopPropagation();
              }}
            />
          </Group>
          <Group mt="xl">
            <RateupButtonSecondary title={translations("Cancel")} onClick={close} />
            <RateupButtonPrimary
              title={translations("Submit")}
              onClick={() => {
                // cloneSurvey.mutate({ id: survey?.id, teamId: selectedTeamID }); // TODO
              }}
            />
          </Group>
        </Stack>
      </Modal>
      <Menu.Target>
        <ActionIcon
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
          leftSection={survey.active ? <IconPlayerPause /> : <IconPlayerPlay />}
          onClick={() => surveyUpdateMutation.mutate({ active: !survey.active })}
        >
          {survey.active ? translations("Pause Survey") : translations("Resume Survey")}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconShare />}
          onClick={() => {
            navigate({
              to: `/dashboard/surveys/${survey?.id}?tab=Share`,
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
        <Menu.Item
          leftSection={<IconTrash />}
          onClick={() => {
            surveyDeleteMutation.mutate(survey?.id);
          }}
        >
          {translations("Delete")}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconSettings />}
          onClick={() => {
            navigate({
              to: `/dashboard/surveys/${survey?.id}?tab=Settings`,
            });
          }}
        >
          {translations("Settings")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

function StatusBadge({ active }) {
  const { t: translations } = useTranslation();
  return (
    <Badge color={active ? "green" : "yellow"}>
      {active ? translations("Active") : translations("Paused")}
    </Badge>
  );
}
