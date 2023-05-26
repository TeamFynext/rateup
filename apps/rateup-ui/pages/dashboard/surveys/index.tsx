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
} from "@mantine/core";
import {
  IconCopy,
  IconDots,
  IconEdit,
  IconMessage,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconShare,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { getTimeSince } from "../../../utils";
import { useDisclosure } from "@mantine/hooks";
import { CreateSurveyModal } from "../../../components/Survey/CreateSurveyModal";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteSurvey, updateSurvey } from "../../../api/surveys/survey.api";
import { useSurveys } from "../../../api/surveys/surveys.query";

export default function Surveys() {
  const [createSurveyOpened, { open, close }] = useDisclosure(false);

  const { isLoading, error, data: surveys } = useSurveys();

  if (isLoading) return <Loader />;
  if (error || !Array.isArray(surveys)) {
    console.error(surveys, error);
    return "An error has occurred";
  }

  return (
    <Container fluid>
      <Title order={2} mb={"md"}>
        Surveys
      </Title>
      <SimpleGrid
        cols={4}
        spacing={"lg"}
        breakpoints={[
          { minWidth: "xl", cols: 3 },
          { minWidth: "lg", cols: 2 },
          { minWidth: "md", cols: 2 },
          { maxWidth: "md", cols: 1 },
        ]}
      >
        <Paper p="md" sx={{ cursor: "pointer" }} onClick={open}>
          <Center h="100%">
            <Stack align="center">
              <IconPlus />
              <Text size="xl">Add Survey</Text>
            </Stack>
          </Center>
        </Paper>

        {surveys.map((s) => (
          <SurveyCard key={s.id} survey={s} />
        ))}
      </SimpleGrid>
      <CreateSurveyModal open={createSurveyOpened} close={close} />
    </Container>
  );
}

interface SurveyCardProps {
  survey: Survey;
}
function SurveyCard({ survey }: SurveyCardProps): JSX.Element {
  const theme = useMantineTheme();
  const [timeSince, setTimeSince] = useState("");
  useEffect(() => {
    setTimeSince(getTimeSince(survey.createdAt));
    const timeoutID = setInterval(
      () => setTimeSince(getTimeSince(survey.createdAt)),
      5000
    );
    return () => clearInterval(timeoutID);
  }, []);

  const router = useRouter();

  return (
    <Paper
      p="md"
      sx={{ cursor: "pointer" }}
      onClick={() => {
        router.push(`surveys/${survey.id}`);
      }}
    >
      <Flex justify={"space-between"}>
        <Text mr={"sm"} truncate size="xl">
          {survey.title}
        </Text>
        <SurveyMenu survey={survey} />
      </Flex>
      <Group align={"center"} mt="sm" spacing="xs">
        <Avatar radius={"xl"} />
        <Text size="sm" c="dimmed">
          Created {timeSince}
        </Text>
      </Group>
      <Flex justify={"space-between"} mt="lg">
        <StatusBadge active={survey.active} />
        <Link
          href="#"
          style={{ color: theme.colors.blue[9] }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Group spacing="4px">
            <IconMessage />
            <Text>{99} Responses</Text>
          </Group>
        </Link>
      </Flex>
    </Paper>
  );
}

function SurveyMenu({ survey }) {
  const queryClient = useQueryClient();
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
        message: "Updated!",
      });
      queryClient.invalidateQueries(["surveys"]);
    },
  });

  return (
    <Menu width={200}>
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
        <Menu.Item icon={<IconEdit />}>Edit</Menu.Item>
        <Menu.Item icon={<IconShare />}>Share</Menu.Item>
        <Menu.Item icon={<IconCopy />}>Clone</Menu.Item>
        <Menu.Item
          icon={<IconTrash />}
          onClick={() => {
            surveyDeleteMutation.mutate(survey.id);
          }}
        >
          Delete
        </Menu.Item>
        <Menu.Item icon={<IconMessage />}>View Responses</Menu.Item>
        <Menu.Item
          icon={survey.active ? <IconPlayerPause /> : <IconPlayerPlay />}
          onClick={() =>
            surveyUpdateMutation.mutate({ active: !survey.active })
          }
        >
          {survey.active ? "Pause Survey" : "Resume Survey"}
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
