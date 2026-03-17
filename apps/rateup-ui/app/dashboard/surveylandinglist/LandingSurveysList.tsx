"use client";

import { JSX, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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
  useMantineTheme,
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
import { useExtracted } from "next-intl";
import { toast } from "sonner";

import {
  deleteSurvey,
  updateSurvey,
} from "../../../backend/surveys/survey.api";
import {
  useCloneSurveyMutation,
  useSurveys,
  useSurveysBylandingId,
  useSurveysByTeam,
} from "../../../backend/surveys/surveys.query";
import { useTeamsByUser } from "../../../backend/team/team.query";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../../../components/Button/RateupButtons";
import { CreateSurveyModal } from "../../../components/Survey/CreateSurveyModal";
import { useUser } from "../../../context/UserContext";
import { getTimeSince } from "../../../utils";

//------------get all surveys under this landing id -----------
export default function LandingSurveysList() {
  const [createSurveyOpened, { open, close }] = useDisclosure(false);
  const [sort, setSort] = useState(false);
  const { user, setUser } = useUser();
  const translations = useExtracted();
  const router = useRouter();
  const searchParams = useSearchParams();
  const LandingId = searchParams.get("LandingId");

  const [options, setOptions] = useState([
    {
      value: "all",
      label: "All Teams",
    },
  ]);
  const [selectedTeamId, setSelectedTeamId] = useState(options[0].value);

  const specificTeamIsSelected = selectedTeamId !== "all";
  //---------check not array ------------
  if (Array.isArray(LandingId)) {
    throw new Error(translations("surveyId is an array"));
  }

  const { isLoading, error, data: surveys } = useSurveysBylandingId(LandingId);
  const queryClient = useQueryClient();

  const {
    data: teamRes,
    isLoading: teamsLoading,
    isError,
    error: teamsError,
  } = useTeamsByUser();

  useEffect(() => {
    if (selectedTeamId !== null) {
      queryClient.invalidateQueries({
        queryKey: ["surveysByTeam", selectedTeamId],
      });
    }
  }, [selectedTeamId, queryClient]);

  const {
    isLoading: isLoadingTeamsUser,
    data: teamsDataUser,
    error: errorTeamsDataUser,
    refetch: reftchTeams,
  } = useTeamsByUser() as UseTeamsByUserResult;

  let teamsData = teamsDataUser?.data;

  const {
    isLoading: isLoadingSurveys,
    error: errSurveysByTeams,
    data: surveysByTeam,
  } = useSurveysByTeam(selectedTeamId, specificTeamIsSelected);

  useEffect(() => {
    if (teamsData?.length) {
      const newOptions = teamsData?.map((team) => ({
        value: team?.id,
        label: team?.name,
      }));

      setOptions((prev) => {
        const uniqueValues = new Set(prev.map((option) => option.value));
        const nonDuplicateOptions = newOptions.filter(
          (option) => !uniqueValues.has(option.value),
        );
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
      <Flex
        mih={50}
        gap="md"
        justify="space-between"
        align="center"
        direction="row"
        wrap="wrap"
      >
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

        <Flex
          mih={50}
          gap="md"
          justify="flex-start"
          align="flex-start"
          direction="row"
          wrap="wrap"
        >
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
              ? new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
              : new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
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

//---------------survey card section starts --------------
interface SurveyCardProps {
  survey: Survey;
}
export function SurveyCard({
  survey,
  teamsData,
}: SurveyCardProps & { teamsData: any }): JSX.Element {
  const theme = useMantineTheme();
  const [timeSince, setTimeSince] = useState("");
  const { user, setUser } = useUser();
  const translations = useExtracted();
  useEffect(() => {
    setTimeSince(getTimeSince(survey.createdAt));
    const timeoutID = setInterval(
      () => setTimeSince(getTimeSince(survey.createdAt)),
      5000,
    );
    return () => clearInterval(timeoutID);
  }, []);

  const router = useRouter();

  return (
    <Paper
      p="md"
      shadow="lg"
      radius="lg"
      style={{ cursor: "pointer" }}
      onClick={() => {
        user?.role === "MEMBER"
          ? router.push(
              `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/responses/${survey?.id}`,
            )
          : router.push(
              `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/${survey?.id}`,
            );
      }}
    >
      <Flex justify={"space-between"} align={"center"}>
        <Text mr={"sm"} truncate size="xl" fw={500}>
          {survey.title}
        </Text>
        <Badge color={survey?.type == "web" ? "blue" : "green"}>
          {survey.type}
        </Badge>
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
          href={`/dashboard/surveys/${survey?.id}?tab=Responses`}
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
  const router = useRouter();
  const translations = useExtracted();
  const [opened, { close, open }] = useDisclosure(false);
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const cloneSurvey = useCloneSurveyMutation({
    close,
    selectedTeamId: selectedTeamID,
  });

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
            <RateupButtonSecondary
              title={translations("Cancel")}
              onClick={close}
            />
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
          onClick={() =>
            surveyUpdateMutation.mutate({ active: !survey.active })
          }
        >
          {survey.active
            ? translations("Pause Survey")
            : translations("Resume Survey")}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconShare />}
          onClick={() => {
            router.push(`/dashboard/surveys/${survey?.id}?tab=Share`);
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
            router.push(`/dashboard/surveys/${survey?.id}?tab=Settings`);
          }}
        >
          {translations("Settings")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

function StatusBadge({ active }) {
  const translations = useExtracted();
  return (
    <Badge color={active ? "green" : "yellow"}>
      {active ? translations("Active") : translations("Paused")}
    </Badge>
  );
}
