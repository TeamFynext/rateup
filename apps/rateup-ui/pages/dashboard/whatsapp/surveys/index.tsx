import {
  Center,
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
  Space,
  Modal,
} from "@mantine/core";
import {
  IconChartBar,
  IconCopy,
  IconDots,
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
} from "../../../../components/Button/RateupButtons";
import Link from "next/link";
import { getTimeSince } from "../../../../utils";
import { useDisclosure } from "@mantine/hooks";
import { CreateSurveyModal } from "../../../../components/Survey/CreateSurveyModal";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteSurvey,
  updateSurvey,
} from "../../../../backend/surveys/survey.api";
import {
  useCloneSurveyMutation,
  useSurveysByTeam,
} from "../../../../backend/surveys/surveys.query";
import { useUser } from "../../../../context/UserContext";
import { TeamSelector } from "../../../../components/input/TeamSelector";
import classes from "./styles.module.css";
// TODO: implement ssr
export default function WhatsappSurveys({ surveys: initialSurveys }) {
  const [createSurveyOpened, { open, close }] = useDisclosure(false);
  const [sort, setSort] = useState(true);
  const { user, setUser } = useUser();
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const { action } = useRouter().query;

  useEffect(() => {
    if (action === "create") {
      open();
    }
  }, [action]);

  const {
    isLoading: isLoading,
    error: error,
    data: allSurveys,
  } = useSurveysByTeam(selectedTeamId, !!selectedTeamId);
  // TODO: create whatsapp surveys query
  const surveys = allSurveys?.filter((s) => s.type === "whatsapp");

  if (error) {
    console.error(surveys, error);
    return "An error has occurred";
  }

  return (
    <>
      <Flex
        mih={50}
        gap="md"
        justify="space-between"
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
          <Title order={1}>Whatsapp Surveys : </Title>
          <TeamSelector value={selectedTeamId} onChange={setSelectedTeamId} />
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
            <Menu.Target>
              <RateupButtonPrimary
                title={"Status"}
                variant="subtle"
                rightIcon={<IconChevronDown size="1rem" />}
              />
            </Menu.Target>
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

      <SimpleGrid cols={{ base: 4, sm: 1, md: 2, lg: 2, xl: 3 }}>
        {user?.role !== "MEMBER" && (
          <Paper
            p="md"
            shadow="lg"
            radius="lg"
            style={{ cursor: "pointer" }}
            onClick={open}
          >
            <Center h="100%">
              <Stack align="center">
                <IconPlus size={36} />
                <Text size="xl" fw={700}>
                  Add Survey
                </Text>
              </Stack>
            </Center>
          </Paper>
        )}

        {!isLoading &&
          surveys
            .slice()
            .sort((a, b) =>
              sort
                ? new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
                : new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
            )
            .map((s) => (
              <SurveyCard
                key={s.id}
                survey={s}
                setSelectedTeamId={setSelectedTeamId}
              />
            ))}
      </SimpleGrid>
      <CreateSurveyModal
        open={createSurveyOpened}
        close={close}
        surveyType={"whatsapp"}
      />
    </>
  );
}

// TODO: make reusable survey card
interface SurveyCardProps {
  survey: Survey;
  setSelectedTeamId: React.Dispatch<React.SetStateAction<string>>;
}
export function SurveyCard({
  survey,
  setSelectedTeamId,
}: SurveyCardProps): JSX.Element {
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
              `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/whatsapp/surveys/responses/${survey?.id}`,
            )
          : router.push(
              `${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/whatsapp/surveys/${survey?.id}`,
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
          <SurveyMenu survey={survey} setSelectedTeamId={setSelectedTeamId} />
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
        <Text>Total Responses : 0</Text>
        <Link
          href={`/dashboard/whatsapp/surveys/${survey.id}?tab=Responses`}
          style={{ color: theme.colors.blue[9] }}
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

function SurveyMenu({ survey, setSelectedTeamId }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [opened, { close, open }] = useDisclosure(false);
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const cloneSurvey = useCloneSurveyMutation({
    close,
    selectedTeamID,
    setSelectedTeamId,
  });

  const surveyDeleteMutation = useMutation({
    mutationFn: deleteSurvey,
    onSuccess: () => {
      notifications.show({
        message: "Deleted!",
      });
      queryClient.invalidateQueries(["surveys"]);
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
            <TeamSelector value={selectedTeamID} onChange={setSelectedTeamID} />
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
