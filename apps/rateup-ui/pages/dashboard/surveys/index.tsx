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
  Space
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
  IconPencil
} from "@tabler/icons-react";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import Link from "next/link";
import { getTimeSince } from "../../../utils";
import { useDisclosure } from "@mantine/hooks";
import { CreateSurveyModal } from "../../../components/Survey/CreateSurveyModal";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteSurvey, updateSurvey } from "../../../backend/surveys/survey.api";
import { useSurveys } from "../../../backend/surveys/surveys.query";

export default function Surveys() {
  const [createSurveyOpened, { open, close }] = useDisclosure(false);

  const { isLoading, error, data: surveys } = useSurveys();
  const [sort, setSort] = useState(false)

  if (isLoading) return <Loader />;
  if (error || !Array.isArray(surveys)) {
    console.error(surveys, error);
    return "An error has occurred";
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
              align="flex-start"
              direction="column"
              wrap="wrap"
          >
              <Title order={1} mb="md">All Surveys</Title>
                  
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
                    rightIcon={<IconChevronDown
                        size="1rem" />}
                />
              </Menu.Target>
{/* 
              <Menu.Dropdown >
                <Menu.Item color="teal" icon={<IconCheck size={14} />}>Active</Menu.Item>
                <Menu.Item color="red" icon={<IconX size={14} />}>Inactive</Menu.Item>
              </Menu.Dropdown> */}
            </Menu>

          <RateupButtonPrimary
              onClick={ () =>  setSort(!sort)}
              title={"Sort"}
              variant="subtle"
              rightIcon={<IconSelector
                  size="1rem" />}
          />
          </Flex>
      </Flex>

      <Space h="xl" />

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
        <Paper p="md" shadow="lg" radius="lg" sx={{ cursor: "pointer" }} onClick={open}>
          <Center h="100%">
            <Stack align="center">
              <IconPlus size={36}/>
              <Text size="xl" fw={700}>Add Survey</Text>
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
export function SurveyCard({ survey }: SurveyCardProps): JSX.Element {
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
      p="md"shadow="lg" radius="lg"
      sx={{ cursor: "pointer" }}
      onClick={() => {
        router.push(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/${survey.id}`);
      }}
    >
      <Flex justify={"space-between"} align={"center"}>
        <Text mr={"sm"} truncate size="xl" fw={700}>
          {survey.title}
        </Text>
        <Group align={"center"} mt="sm" spacing="xs">
        <IconPencil />
        <SurveyMenu survey={survey} />
        </Group>
        
      </Flex>
      <Group align={"center"} mt="sm" spacing="xs">
        <Avatar radius={"xl"} />
        <Text size="sm" c="dimmed">
          Created {timeSince}
        </Text>
      </Group>
      <Space h="xl" />
      <Space h="lg" />

      <Flex justify={"space-between"} mt="xl"  align={"center"}>
        <StatusBadge active={survey.active}/>
        <Text>Total Responses : 0</Text>
        <Link
          href="#"
          style={{ color: theme.colors.blue[9] }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Group spacing="4px">
            <IconChartBar size={20} />
            <Text>Responses</Text>
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
        id:'survey',
        message: "Survey status Updated!",
        autoClose: true,
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
