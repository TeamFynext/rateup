import {
  Center,
  Container,
  Paper,
  Title,
  Text,
  Stack,
  SimpleGrid,
  Flex,
  Menu,
  Avatar,
  Badge,
  ActionIcon,
  useMantineTheme,
  Group,
  Loader,
  Space,
  Select,
  Modal,
} from "@mantine/core";
import {
  IconChartBar,
  IconCopy,
  IconDots,
  IconEdit,
  IconMessage,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconShare,
  IconTrash,
  IconSelector,
  IconChevronDown,
  IconPencil,
  IconSettings,
} from "@tabler/icons-react";
import {
  RateupButtonPrimary,
  RateupButtonSecondary,
} from "../../../components/Button/RateupButtons";
import Link from "next/link";
import { getTimeSince } from "../../../utils";
import { useDisclosure } from "@mantine/hooks";
import { CreateSurveyModal } from "../../../components/Survey/CreateSurveyModal";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteSurvey,
  updateSurvey,
} from "../../../backend/surveys/survey.api";
import {
  useCloneSurveyMutation,
  useSurveys,
  useSurveysByTeam,
  useSurveysBylandingId,
} from "../../../backend/surveys/surveys.query";
import { useTeamsByUser } from "../../../backend/team/team.query";
import { useUser } from "../../../context/UserContext";

//------------get all surveys under this landing id -----------
export default function LandingSurveysList() {
  const [createSurveyOpened, { open, close }] = useDisclosure(false);
  const [sort, setSort] = useState(false);
  const { user, setUser } = useUser();

  const router = useRouter();
  const { LandingId } = router.query;

  const [options, setOptions] = useState([
    {
      value: "all",
      label: "All Teams",
      group: "Organization",
    },
  ]);
  const [selectedTeamId, setSelectedTeamId] = useState(options[0].value);

  const specificTeamIsSelected = selectedTeamId !== "all";
  //---------check not array ------------
  if (Array.isArray(LandingId)) {
    throw new Error("surveyId is an array");
  }

  const { isLoading, error, data: surveys } = useSurveysBylandingId(LandingId);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (selectedTeamId !== null) {
      queryClient.invalidateQueries(["surveysByTeam", selectedTeamId]);
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
    //console.log("test.........."+JSON.stringify(teamsData))
    if (teamsData?.length) {
      const newOptions = teamsData?.map((team) => ({
        value: team?.teamId,
        label: team?.teamName,
        group: "Team",
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
    queryClient.invalidateQueries(["surveysByTeam", selectedTeamId]);
  }, [selectedTeamId]);

  if (isLoading) return <Loader />;
  if (error || !Array.isArray(surveys)) {
    console.error(surveys, error);
    return <>"An error has occurred"</>;
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
          <Title order={5}> survey list under: {LandingId} </Title>

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
            title={"Sort"}
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
          .slice()
          .sort((a, b) =>
            sort
              ? new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
              : new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
          )
          .map((s) => (
            <SurveyCard key={s.id} survey={s} teamsData={teamsData} />
          ))}
      </SimpleGrid>
      <CreateSurveyModal
        open={createSurveyOpened}
        close={close}
        surveyType={"web"}
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
        <Text mr={"sm"} truncate size="xl" fw={700}>
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
          Created {timeSince}
        </Text>
      </Group>
      <Space h="xl" />
      <Space h="lg" />

      <Flex justify={"space-between"} mt="xl" align={"center"}>
        <StatusBadge active={survey.active} />
        {/* <Text>Total Responses : #</Text> */}
        {/* //TODO */}
        <Link
          href={`/dashboard/surveys/${survey.id}?tab=Responses`}
          style={{ color: "var(--tertiary-color)" }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Group gap="4px">
            <IconChartBar size={20} />
            <Text>Responses</Text>
          </Group>
        </Link>
      </Flex>
    </Paper>
  );
}

function SurveyMenu({ survey, teamsData }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [opened, { close, open }] = useDisclosure(false);
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const cloneSurvey = useCloneSurveyMutation({
    close,
    selectedTeamID,
  });

  const [options, setOptions] = useState([]);

  useEffect(() => {
    const newOptions = teamsData?.map((team) => ({
      value: team?.teamId,
      label: team?.teamName,
    }));

    setOptions(newOptions);
  }, [teamsData]);

  const surveyDeleteMutation = useMutation({
    mutationFn: deleteSurvey,
    onSuccess: () => {
      notifications.show({
        message: "Deleted!",
      });
      queryClient.invalidateQueries(["surveys"]);
      queryClient.invalidateQueries(["surveysByTeam"]);
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
      queryClient.invalidateQueries(["surveys"]);
      queryClient.invalidateQueries(["surveysByTeam"]);
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
            <Select
              label="Select Team"
              maxDropdownHeight={150}
              mt="xs"
              placeholder="Pick one"
              data={options}
              value={selectedTeamID}
              onChange={(value) => setSelectedTeamID(value)}
              onClick={(event) => {
                event.stopPropagation();
              }}
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
          {survey.active ? "Pause Survey" : "Resume Survey"}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconShare />}
          onClick={() => {
            router.push(`/dashboard/surveys/${survey?.id}?tab=Share`);
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
        <Menu.Item
          leftSection={<IconTrash />}
          onClick={() => {
            surveyDeleteMutation.mutate(survey?.id);
          }}
        >
          Delete
        </Menu.Item>

        <Menu.Item
          leftSection={<IconSettings />}
          onClick={() => {
            router.push(`/dashboard/surveys/${survey?.id}?tab=Settings`);
          }}
        >
          Settings
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

function StatusBadge({ active }) {
  return (
    <Badge color={active ? "green" : "yellow"}>
      {active ? "Active" : "Paused"}
    </Badge>
  );
}
